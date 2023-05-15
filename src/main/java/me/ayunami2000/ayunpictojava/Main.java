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
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.Activity;
import net.dv8tion.jda.api.entities.Message;
import net.dv8tion.jda.api.entities.channel.concrete.TextChannel;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.exceptions.InvalidTokenException;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.requests.GatewayIntent;
import net.dv8tion.jda.api.utils.FileUpload;
import org.jetbrains.annotations.NotNull;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.GeneralPath;
import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.Reader;
import java.lang.reflect.Field;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {
	private static JDA jda = null;
	private static String channel1 = null;
	private static String channel2 = null;
	private static String channel3 = null;
	private static String channel4 = null;

	public static void main(String[] args) throws InterruptedException, IOException {
		File settingsFile = new File("settings.json");
		if (settingsFile.isDirectory()) {
			System.exit(1);
			return;
		}
		if (!settingsFile.exists()) Files.copy(Objects.requireNonNull(Main.class.getResourceAsStream("/settings.json")), Paths.get("settings.json"), StandardCopyOption.REPLACE_EXISTING);
		Reader reader = Files.newBufferedReader(settingsFile.toPath());
		JsonObject settingsJson = new Gson().fromJson(reader, JsonObject.class);
		reader.close();
		int port = 8080;
		if (settingsJson.has("port")) port = settingsJson.get("port").getAsInt();
		String host = "127.0.0.1";
		if (settingsJson.has("host")) host = settingsJson.get("host").getAsString();
		String web = "www";
		if (settingsJson.has("web")) web = settingsJson.get("web").getAsString();
		if (settingsJson.has("discord")) {
			JsonObject discordJson = settingsJson.getAsJsonObject("discord");
			if (discordJson.has("enabled") && discordJson.get("enabled").getAsBoolean() && discordJson.has("token") && discordJson.has("channels")) {
				String token = discordJson.get("token").getAsString();
				JsonArray channels = discordJson.getAsJsonArray("channels");
				if (channels.size() > 0) {
					channel1 = channels.get(0).getAsString();
					if (channels.size() > 1) {
						channel2 = channels.get(1).getAsString();
						if (channels.size() > 2) {
							channel3 = channels.get(2).getAsString();
							if (channels.size() > 3) channel4 = channels.get(3).getAsString();
						}
					}
					try {
						jda = JDABuilder.createDefault(token).setActivity(Activity.playing("PictoChat Online")).enableIntents(GatewayIntent.GUILD_MESSAGES, GatewayIntent.MESSAGE_CONTENT).addEventListeners(new ListenerAdapter() {
							@Override
							public void onMessageReceived(@NotNull MessageReceivedEvent event) {
								if (event.getAuthor().isBot()) return;
								StringBuilder content = new StringBuilder(event.getMessage().getContentStripped().trim());
								for (Message.Attachment attachment : event.getMessage().getAttachments()) content.append(" ").append(attachment.getUrl());
								if (content.length() == 0) return;
								String channelId = event.getChannel().getId();
								Map<JsonObject, ChannelHandlerContext> USERS;
								if (channelId.equals(channel1)) {
									USERS = USERS_A;
								} else if (channelId.equals(channel2)) {
									USERS = USERS_B;
								} else if (channelId.equals(channel3)) {
									USERS = USERS_C;
								} else if (channelId.equals(channel4)) {
									USERS = USERS_D;
								} else {
									return;
								}
								JsonObject jsonObject = new JsonObject();
								jsonObject.addProperty("type", "sv_receivedMessage");
								JsonObject message = new JsonObject();
								JsonArray drawings = new JsonArray();
								JsonObject drawing = new JsonObject();
								drawing.addProperty("x", 0);
								drawing.addProperty("y", 0);
								drawing.addProperty("type", 3);
								drawings.add(drawing);
								message.add("drawing", drawings);
								JsonArray textboxes = new JsonArray();
								String[] lines;
								if (content.length() > 25) {
									String firstLine = content.substring(0, 25);
									String[] lastLines = content.substring(25).split("(?<=\\G.{40})", 4);
									lines = new String[lastLines.length + 1];
									System.arraycopy(lastLines, 0, lines, 1, lastLines.length);
									lines[0] = firstLine;
									String lastLine = lines[lines.length - 1];
									if (lastLine.length() > 37) lines[lines.length - 1] = lastLine.substring(0, 37) + "...";
								} else {
									lines = new String[] {content.toString()};
								}
								for (int i = 0; i < lines.length; i++) {
									JsonObject textbox = new JsonObject();
									textbox.addProperty("x", i == 0 ? 113 : 27);
									textbox.addProperty("y", 211 + i * 16);
									textbox.addProperty("text", lines[i]);
									textboxes.add(textbox);
								}
								message.add("textboxes", textboxes);
								message.addProperty("lines", lines.length);
								JsonObject player = new JsonObject();
								String name = event.getAuthor().getAsTag();
								if (name.length() > 10) name = name.substring(0, 10);
								player.addProperty("name", name);
								player.addProperty("color", 7506394);
								message.add("player", player);
								jsonObject.add("message", message);
								sendToOthers(null, jsonObject, USERS);
							}
						}).build();
					} catch (InvalidTokenException e) {
						System.err.println("Failed to enable Discord mirror: Invalid bot token!");
					}
				}
			}
		}
		EventLoopGroup bossGroup = new NioEventLoopGroup();
		EventLoopGroup workerGroup = new NioEventLoopGroup();
		try {
			ServerBootstrap b = new ServerBootstrap();
			String finalWeb = web;
			b.group(bossGroup, workerGroup)
					.channel(NioServerSocketChannel.class)
					.childHandler(new ChannelInitializer<Channel>() {
						@Override
						protected void initChannel(@NotNull Channel ch) {
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
									if (finalWeb == null || (request.headers().contains(HttpHeaderNames.CONNECTION) && request.headers().get(HttpHeaderNames.CONNECTION).toLowerCase().contains("upgrade") && request.headers().contains(HttpHeaderNames.UPGRADE) && request.headers().get(HttpHeaderNames.UPGRADE).toLowerCase().contains("websocket"))) {
										pipeline.addLast("websocket-server-compression-handler", new WebSocketServerCompressionHandler());
										pipeline.addLast("websocket-server-protocol-handler", new WebSocketServerProtocolHandler("/", null, true, 65536));
										pipeline.addLast("websocket-frametojson", new WebSocketFrameToJsonObjectDecoder());
										pipeline.addLast("websocket-jsontoframe", new JsonObjectToWebSocketFrameEncoder());
										pipeline.addLast("server-handler", new ServerHandler());
									} else {
										pipeline.addLast(new HttpStaticFileServerHandler(finalWeb));
									}
									if (request instanceof FullHttpRequest) ((FullHttpRequest) request).retain();
									pipeline.fireChannelRead(request);
								}
							});
						}
					}).option(ChannelOption.SO_BACKLOG, 128)
					.childOption(ChannelOption.SO_KEEPALIVE, true);

			ChannelFuture f = b.bind(host, port).sync();
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

	private static String filterMsg(String in) {
		return in.replaceAll("(\\_|\\*|\\~|\\`|\\||\\\\|\\<|\\>|\\:|\\!)", "\\\\$1").replaceAll("@(everyone|here|[!&]?[0-9]{17,21})", "@\u200b\\\\$1");
	}

	private static final Map<JsonObject, ChannelHandlerContext> USERS_A = new HashMap<>();

	private static final Map<JsonObject, ChannelHandlerContext> USERS_B = new HashMap<>();

	private static final Map<JsonObject, ChannelHandlerContext> USERS_C = new HashMap<>();

	private static final Map<JsonObject, ChannelHandlerContext> USERS_D = new HashMap<>();

	private static void sendToOthers(JsonObject player, JsonObject jsonObject, Map<JsonObject, ChannelHandlerContext> USERS) {
		for (JsonObject user : USERS.keySet()) {
			if (user.equals(player)) continue;
			USERS.get(user).writeAndFlush(jsonObject);
		}
	}

	static class ServerHandler extends SimpleChannelInboundHandler<JsonObject> {
		private static final AttributeKey<JsonObject> PLAYER_DATA = AttributeKey.newInstance("player-data");

		private static final AttributeKey<String> ROOM_ID = AttributeKey.newInstance("room-id");

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
					String channel = getDiscordChannelForRoomId(roomId);
					if (channel != null) {
						TextChannel textChannel = jda.getTextChannelById(channel);
						if (textChannel != null) textChannel.sendMessage(filterMsg("\u00BB " + player.get("name").getAsString())).queue();
					}
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
					StringBuilder textRawBuilder = new StringBuilder();
					JsonArray textboxes = jsonObject.getAsJsonObject("message").getAsJsonArray("textboxes");
					JsonArray textboxesOut = new JsonArray();
					for (JsonElement textbox : textboxes) {
						if (!textbox.isJsonObject()) continue;
						JsonObject textboxObject = (JsonObject) textbox;
						if (textboxObject.has("text")) {
							String text = textboxObject.remove("text").getAsString();
							if (text.length() > 30) text = text.substring(0, 30);
							textRawBuilder.append("\n").append(text);
							textboxObject.addProperty("text", text);
							textboxesOut.add(textboxObject);
							if (textboxesOut.size() >= 50) break;
						}
					}
					String textRaw = textRawBuilder.toString().trim();
					player = ctx.channel().attr(PLAYER_DATA).get();
					jsonObject.remove("type");
					jsonObject.addProperty("type", "sv_receivedMessage");
					jsonObject.getAsJsonObject("message").remove("player");
					jsonObject.getAsJsonObject("message").add("player", player);
					sendToOthers(player, jsonObject, USERS);
					channel = getDiscordChannelForRoomId(roomId);
					if (channel != null) {
						TextChannel textChannel = jda.getTextChannelById(channel);
						if (textChannel != null) {
							if (!textRaw.isEmpty()) textChannel.sendMessage(filterMsg(player.get("name").getAsString() + " \u00BB " + textRaw)).queue();
							if (jsonObject.getAsJsonObject("message").has("drawing")) {
								JsonArray drawing = jsonObject.getAsJsonObject("message").getAsJsonArray("drawing");
								int num = 0;
								for (JsonElement jsonElement : drawing) {
									JsonObject drawingObj = jsonElement.getAsJsonObject();
									if (!drawingObj.has("type")) continue;
									if (!drawingObj.has("x")) continue;
									if (!drawingObj.has("y")) continue;
									if (++num > 1) break;
								}
								if (num > 1) {
									Dimension imgDim = new Dimension(232, 83);
									BufferedImage drawingImage = new BufferedImage(imgDim.width, imgDim.height, BufferedImage.TYPE_INT_RGB);
									Graphics2D g2d = drawingImage.createGraphics();
									g2d.setBackground(new Color(0xfbfbfb));
									g2d.fillRect(0, 0, imgDim.width, imgDim.height);
									g2d.setStroke(new BasicStroke(1));
									g2d.setColor(new Color(0));
									GeneralPath polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
									for (JsonElement jsonElement : drawing) {
										JsonObject drawingObj = jsonElement.getAsJsonObject();
										if (!drawingObj.has("type")) continue;
										if (!drawingObj.has("x")) continue;
										if (!drawingObj.has("y")) continue;
										int type = drawingObj.get("type").getAsInt();
										double x = drawingObj.get("x").getAsDouble() - 22;
										double y = drawingObj.get("y").getAsDouble() - 208;
										switch (type) {
											case 0:
												polyline.lineTo(x, y);
												break;
											case 1:
											case 2:
												polyline.moveTo(x, y);
												break;
											case 3:
												Point2D point = polyline.getCurrentPoint();
												if (point != null) {
													g2d.draw(polyline);
													polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
													polyline.moveTo(point.getX(), point.getY());
												}
												g2d.setStroke(new BasicStroke(2));
												break;
											case 4:
												point = polyline.getCurrentPoint();
												if (point != null) {
													g2d.draw(polyline);
													polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
													polyline.moveTo(point.getX(), point.getY());
												}
												g2d.setStroke(new BasicStroke(1));
												break;
											case 5:
												point = polyline.getCurrentPoint();
												if (point != null) {
													g2d.draw(polyline);
													polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
													polyline.moveTo(point.getX(), point.getY());
												}
												g2d.setColor(new Color(0));
												break;
											case 6:
												point = polyline.getCurrentPoint();
												if (point != null) {
													g2d.draw(polyline);
													polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
													polyline.moveTo(point.getX(), point.getY());
												}
												g2d.setColor(new Color(0xfbfbfb));
												break;
										}
									}
									g2d.draw(polyline);
									g2d.setColor(new Color(player.get("color").getAsInt()));
									g2d.setStroke(new BasicStroke(1));
									g2d.drawString(player.get("name").getAsString(), 2, 14);
									ByteArrayOutputStream baos = new ByteArrayOutputStream();
									try {
										ImageIO.write(drawingImage, "PNG", baos);
										textChannel.sendFiles(FileUpload.fromData(baos.toByteArray(), "drawing.png")).queue();
									} catch (IOException ignored) {
									}
								}
							}
						}
					}
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
					channel = getDiscordChannelForRoomId(roomId);
					if (channel != null) {
						TextChannel textChannel = jda.getTextChannelById(channel);
						if (textChannel != null) textChannel.sendMessage(filterMsg("\u00AB " + player.get("name").getAsString())).queue();
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
				String channel = getDiscordChannelForRoomId(roomId);
				if (channel != null) {
					TextChannel textChannel = jda.getTextChannelById(channel);
					if (textChannel != null) textChannel.sendMessage(filterMsg("\u00AB " + player.get("name").getAsString())).queue();
				}
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

		private static String getDiscordChannelForRoomId(String roomId) {
			switch (roomId) {
				case "room_a":
					return channel1;
				case "room_b":
					return channel2;
				case "room_c":
					return channel3;
				case "room_d":
					return channel4;
				default:
					return null;
			}
		}
	}
}