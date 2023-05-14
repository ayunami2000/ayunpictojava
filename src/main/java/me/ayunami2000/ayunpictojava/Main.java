package me.ayunami2000.ayunpictojava;

import com.google.gson.*;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.*;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.MessageToMessageDecoder;
import io.netty.handler.codec.MessageToMessageEncoder;
import io.netty.handler.codec.http.*;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.codec.http.websocketx.extensions.compression.WebSocketServerCompressionHandler;
import io.netty.util.AttributeKey;

import java.lang.reflect.Field;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();
        try {
            ServerBootstrap b = new ServerBootstrap();
            b.group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .childHandler(new ChannelInitializer<Channel>() {
                        @Override
                        protected void initChannel(Channel ch) {
                            ChannelPipeline pipeline = ch.pipeline();
                            pipeline.addLast("http-server-codec", new HttpServerCodec());
                            pipeline.addLast("http-object-aggregator", new HttpObjectAggregator(65536));
                            pipeline.addLast("http-websocket-detector", new SimpleChannelInboundHandler<HttpRequest>() {
                                @Override
                                protected void channelRead0(ChannelHandlerContext ctx, HttpRequest request) throws NoSuchFieldException, IllegalAccessException {
                                    pipeline.remove("http-websocket-detector");
                                    String ip = request.headers().get("X-FORWARDED-FOR");
                                    if (ip != null) {
                                        Field remoteAddressField = AbstractChannel.class.getDeclaredField("remoteAddress");
                                        remoteAddressField.setAccessible(true);
                                        remoteAddressField.set(ctx.channel(), new InetSocketAddress(ip, 0));
                                    }
                                    if (request.headers().contains(HttpHeaderNames.CONNECTION) && request.headers().get(HttpHeaderNames.CONNECTION).toLowerCase().contains("upgrade") && request.headers().contains(HttpHeaderNames.UPGRADE) && request.headers().get(HttpHeaderNames.UPGRADE).toLowerCase().contains("websocket")) {
                                        pipeline.addLast("websocket-server-compression-handler", new WebSocketServerCompressionHandler());
                                        pipeline.addLast("websocket-server-protocol-handler", new WebSocketServerProtocolHandler("/", null, true, 65536));
                                        pipeline.addLast("websocket-frametojson", new WebSocketFrameToJsonObjectDecoder());
                                        pipeline.addLast("websocket-jsontoframe", new JsonObjectToWebSocketFrameEncoder());
                                        pipeline.addLast("server-handler", new ServerHandler());
                                    } else {
                                        pipeline.addLast(new HttpStaticFileServerHandler());
                                    }
                                    if (request instanceof FullHttpRequest) ((FullHttpRequest) request).retain();
                                    pipeline.fireChannelRead(request);
                                }
                            });
                        }
                    }).option(ChannelOption.SO_BACKLOG, 128)
                    .childOption(ChannelOption.SO_KEEPALIVE, true);

            ChannelFuture f = b.bind(8080).sync();
            f.channel().closeFuture().sync();
        } finally {
            workerGroup.shutdownGracefully();
            bossGroup.shutdownGracefully();
        }
    }

    static class WebSocketFrameToJsonObjectDecoder extends MessageToMessageDecoder<TextWebSocketFrame> {
        @Override
        protected void decode(ChannelHandlerContext ctx, TextWebSocketFrame frame, List<Object> out) {
            if (frame.text().equals("pong")) {
                ctx.channel().eventLoop().schedule(() -> {
                    if (ctx.channel().isOpen()) ctx.writeAndFlush(new TextWebSocketFrame("ping"));
                }, 10, TimeUnit.SECONDS);
                return;
            }
            try {
                out.add(new Gson().fromJson(frame.text(), JsonObject.class));
            } catch (JsonSyntaxException ignored) {}
        }
    }

    static class JsonObjectToWebSocketFrameEncoder extends MessageToMessageEncoder<JsonObject> {
        @Override
        protected void encode(ChannelHandlerContext ctx, JsonObject jsonObject, List<Object> out) {
            out.add(new TextWebSocketFrame(jsonObject.toString()));
        }
    }

    static class ServerHandler extends SimpleChannelInboundHandler<JsonObject> {
        private static final AttributeKey<JsonObject> PLAYER_DATA = AttributeKey.newInstance("player-data");

        private static final AttributeKey<String> ROOM_ID = AttributeKey.newInstance("room-id");

        private static final Map<JsonObject, ChannelHandlerContext> USERS_A = new HashMap<>();

        private static final Map<JsonObject, ChannelHandlerContext> USERS_B = new HashMap<>();

        private static final Map<JsonObject, ChannelHandlerContext> USERS_C = new HashMap<>();

        private static final Map<JsonObject, ChannelHandlerContext> USERS_D = new HashMap<>();

        private static final Set<InetAddress> ABUSERS = new HashSet<>();

        private static final Map<InetAddress, AtomicInteger> CONS_PER_IP = new HashMap<>();

        private boolean playerChecks(JsonObject jsonObject) {
            if (!jsonObject.has("player")) return true;
            JsonObject player = jsonObject.getAsJsonObject("player");
            return !player.has("name") || !player.has("color");
        }

        @Override
        protected void channelRead0(ChannelHandlerContext ctx, JsonObject jsonObject) {
            InetAddress ip = ((InetSocketAddress) ctx.channel().remoteAddress()).getAddress();
            if (!jsonObject.has("type")) {
                ctx.close();
                return;
            }
            switch (jsonObject.get("type").getAsString()) {
                case "cl_verifyName":
                    if (playerChecks(jsonObject)) {
                        ctx.close();
                        return;
                    }
                    JsonObject player = jsonObject.getAsJsonObject("player");
                    String name = player.remove("name").getAsString().replaceAll("[^A-Za-z0-9_]", "");
                    if (name.isEmpty()) name = String.valueOf(ThreadLocalRandom.current().nextInt(0, 1000000));
                    if (name.length() > 10) name = name.substring(0, 10);
                    player.addProperty("name", name);
                    int color = player.remove("color").getAsInt();
                    if (color < 0 || color > 16777215) color = 0;
                    player.addProperty("color", color);
                    ctx.channel().attr(PLAYER_DATA).set(player);
                    JsonObject res = new JsonObject();
                    res.addProperty("type", "sv_nameVerified");
                    res.add("player", player);
                    ctx.writeAndFlush(res);
                    res = new JsonObject();
                    res.addProperty("type", "sv_roomIds");
                    JsonArray tmp = new JsonArray();
                    tmp.add(USERS_A.size());
                    tmp.add(USERS_B.size());
                    tmp.add(USERS_C.size());
                    tmp.add(USERS_D.size());
                    res.add("count", tmp);
                    tmp = new JsonArray();
                    tmp.add("room_a");
                    tmp.add("room_b");
                    tmp.add("room_c");
                    tmp.add("room_d");
                    res.add("ids", tmp);
                    ctx.writeAndFlush(res);
                    break;
                case "cl_joinRoom":
                    if (!ctx.channel().hasAttr(PLAYER_DATA)) {
                        ctx.close();
                        return;
                    }
                    if (playerChecks(jsonObject) || !jsonObject.has("id")) {
                        ctx.close();
                        return;
                    }
                    String roomId = jsonObject.get("id").getAsString();
                    Map<JsonObject, ChannelHandlerContext> USERS = getUsersForRoomId(roomId);
                    if (USERS == null) return;
                    ctx.channel().attr(ROOM_ID).set(roomId);
                    if (USERS.size() > 16 || ABUSERS.contains(ip)) {
                        ctx.close();
                        return;
                    }
                    player = ctx.channel().attr(PLAYER_DATA).get();
                    if (USERS.containsKey(player)) {
                        ctx.close();
                        return;
                    }
                    if (USERS.keySet().stream().anyMatch(jsonObject1 -> jsonObject1.get("name").getAsString().equals(player.get("name").getAsString()))) {
                        ctx.close();
                        return;
                    }
                    USERS.put(player, ctx);
                    res = new JsonObject();
                    res.addProperty("type", "sv_roomData");
                    res.addProperty("id", roomId);
                    ctx.writeAndFlush(res);
                    res = new JsonObject();
                    res.addProperty("type", "sv_playerJoined");
                    res.add("player", player);
                    res.addProperty("id", roomId);
                    sendToOthers(player, res, USERS);
                    break;
                case "cl_sendMessage":
                    if (!ctx.channel().hasAttr(PLAYER_DATA)) {
                        ctx.close();
                        return;
                    }
                    roomId = ctx.channel().attr(ROOM_ID).get();
                    if (roomId == null) return;
                    USERS = getUsersForRoomId(roomId);
                    if (USERS == null) return;
                    if (!jsonObject.has("message") || playerChecks(jsonObject.getAsJsonObject("message")) || !jsonObject.getAsJsonObject("message").has("textboxes") || !jsonObject.getAsJsonObject("message").has("lines") || jsonObject.getAsJsonObject("message").get("lines").getAsInt() > 5 || jsonObject.getAsJsonObject("message").get("lines").getAsInt() <= 0) {
                        ctx.close();
                        return;
                    }
                    JsonArray textboxes = jsonObject.getAsJsonObject("message").getAsJsonArray("textboxes");
                    JsonArray textboxesOut = new JsonArray();
                    for (JsonElement textbox : textboxes) {
                        if (!textbox.isJsonObject()) continue;
                        JsonObject textboxObject = (JsonObject) textbox;
                        if (textboxObject.has("text")) {
                            String text = textboxObject.remove("text").getAsString();
                            if (text.length() > 30) text = text.substring(0, 30);
                            textboxObject.addProperty("text", text);
                            textboxesOut.add(textboxObject);
                            if (textboxesOut.size() >= 50) break;
                        }
                    }
                    player = ctx.channel().attr(PLAYER_DATA).get();
                    jsonObject.remove("type");
                    jsonObject.addProperty("type", "sv_receivedMessage");
                    jsonObject.getAsJsonObject("message").remove("player");
                    jsonObject.getAsJsonObject("message").add("player", player);
                    sendToOthers(player, jsonObject, USERS);
                    break;
                case "cl_leaveRoom":
                    if (!ctx.channel().hasAttr(PLAYER_DATA)) {
                        ctx.close();
                        return;
                    }
                    roomId = ctx.channel().attr(ROOM_ID).getAndSet(null);
                    if (roomId == null) return;
                    USERS = getUsersForRoomId(roomId);
                    if (USERS == null) return;
                    player = ctx.channel().attr(PLAYER_DATA).get();
                    if (USERS.containsKey(player)) {
                        USERS.remove(player);
                        JsonObject jsonObject1 = new JsonObject();
                        jsonObject1.addProperty("type", "sv_playerLeft");
                        jsonObject1.add("player", player);
                        jsonObject1.addProperty("id", roomId);
                        sendToOthers(player, jsonObject1, USERS);
                    }
                    break;
            }
        }

        @Override
        public void channelActive(ChannelHandlerContext ctx) throws Exception {
            InetAddress ip = ((InetSocketAddress) ctx.channel().remoteAddress()).getAddress();
            super.channelActive(ctx);
            CONS_PER_IP.putIfAbsent(ip, new AtomicInteger(0));
            if (CONS_PER_IP.get(ip).getAndIncrement() > 5) {
                ctx.close();
                return;
            }
            final int[] rate = {0};
            ctx.channel().eventLoop().scheduleAtFixedRate(() -> {
                if (rate[0] >= 10) {
                    ABUSERS.add(ip);
                    ctx.channel().eventLoop().schedule(() -> {
                        ABUSERS.remove(ip);
                    }, 10, TimeUnit.SECONDS);
                    ctx.close();
                } else {
                    rate[0] = 0;
                }
            }, 0, 5, TimeUnit.SECONDS);
        }

        @Override
        public void channelInactive(ChannelHandlerContext ctx) throws Exception {
            InetAddress ip = ((InetSocketAddress) ctx.channel().remoteAddress()).getAddress();
            super.channelInactive(ctx);
            if (CONS_PER_IP.containsKey(ip) && CONS_PER_IP.get(ip).decrementAndGet() == 0) CONS_PER_IP.remove(ip);
            if (ctx.channel().hasAttr(PLAYER_DATA)) {
                String roomId = ctx.channel().attr(ROOM_ID).get();
                if (roomId == null) return;
                Map<JsonObject, ChannelHandlerContext> USERS = getUsersForRoomId(roomId);
                if (USERS == null) return;
                JsonObject player = ctx.channel().attr(PLAYER_DATA).get();
                USERS.remove(player);
                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("type", "sv_playerLeft");
                jsonObject.add("player", player);
                jsonObject.addProperty("id", roomId);
                sendToOthers(player, jsonObject, USERS);
            }
        }

        private void sendToOthers(JsonObject player, JsonObject jsonObject, Map<JsonObject, ChannelHandlerContext> USERS) {
            for (JsonObject user : USERS.keySet()) {
                if (user.equals(player)) continue;
                USERS.get(user).writeAndFlush(jsonObject);
            }
        }

        private static Map<JsonObject, ChannelHandlerContext> getUsersForRoomId(String roomId) {
            switch (roomId) {
                case "room_a":
                    return USERS_A;
                case "room_b":
                    return USERS_B;
                case "room_c":
                    return USERS_C;
                case "room_d":
                    return USERS_D;
                default:
                    return null;
            }
        }
    }
}