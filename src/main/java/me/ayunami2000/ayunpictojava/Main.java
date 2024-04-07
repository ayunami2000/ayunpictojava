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
import net.dv8tion.jda.api.EmbedBuilder;
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.Activity;
import net.dv8tion.jda.api.entities.Message;
import net.dv8tion.jda.api.entities.MessageEmbed;
import net.dv8tion.jda.api.entities.channel.concrete.TextChannel;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import net.dv8tion.jda.api.events.session.ReadyEvent;
import net.dv8tion.jda.api.exceptions.InvalidTokenException;
import net.dv8tion.jda.api.hooks.ListenerAdapter;
import net.dv8tion.jda.api.requests.GatewayIntent;
import net.dv8tion.jda.api.utils.FileUpload;
import org.asynchttpclient.AsyncHttpClient;
import org.asynchttpclient.Dsl;
import org.jetbrains.annotations.NotNull;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.GeneralPath;
import java.awt.geom.Point2D;
import java.awt.image.BufferedImage;
import java.awt.image.ColorModel;
import java.awt.image.WritableRaster;
import java.io.*;
import java.lang.reflect.Field;
import java.math.BigInteger;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

public class Main {
	private static final Gson gson = new Gson();
	private static JDA jda = null;
	private static String secret = System.getenv("PICTOJAVA_SECRET");
	private static String tcSecret = System.getenv("PICTOJAVA_TRIPCODE_SECRET");
	private static String channel1 = null;
	private static String channel2 = null;
	private static String channel3 = null;
	private static String channel4 = null;
	private static String channelConsole = null;

	// https://stackoverflow.com/a/24316335
	public static void copyFromJar(String source, final Path target) throws URISyntaxException, IOException {
		URI resource = Objects.requireNonNull(Main.class.getResource("")).toURI();
		try (FileSystem fileSystem = FileSystems.newFileSystem(resource, Collections.<String, String>emptyMap())) {
			final Path jarPath = fileSystem.getPath(source);
			Files.walkFileTree(jarPath, new SimpleFileVisitor<Path>() {
				@Override
				public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
					Path currentTarget = target.resolve(jarPath.relativize(dir).toString());
					Files.createDirectories(currentTarget);
					return FileVisitResult.CONTINUE;
				}

				@Override
				public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
					Files.copy(file, target.resolve(jarPath.relativize(file).toString()), StandardCopyOption.REPLACE_EXISTING);
					return FileVisitResult.CONTINUE;
				}
			});
		}
	}

	private static final Color fgColor = new Color(0);
	private static final Color bgColor = new Color(0xfbfbfb);

	// https://github.com/Regarrzo/Java-Floyd-Steinberg-Dithering
	private static final ColorPalette bwPalette = new ColorPalette(new Color[]{fgColor, bgColor});

	private static void dither(BufferedImage img) {
		for (int y = 0; y < img.getHeight(); y++) {
			for (int x = 0; x < img.getWidth(); x++) {
				VectorRGB current_color = new VectorRGB(img.getRGB(x, y));
				VectorRGB closest_match = bwPalette.getClosestMatch(current_color);
				VectorRGB error = current_color.subtract(closest_match);
				img.setRGB(x, y, closest_match.toRGB());
				if (!(x == img.getWidth() - 1)) {
					img.setRGB(x + 1, y, ((new VectorRGB(img.getRGB(x + 1, y)).add(error.scalarMultiply((float) 7 / 16))).clip(0, 255).toRGB()));
					if (!(y == img.getHeight() - 1))
						img.setRGB(x + 1, y + 1, ((new VectorRGB(img.getRGB(x + 1, y + 1)).add(error.scalarMultiply((float) 1 / 16))).clip(0, 255).toRGB()));
				}
				if (!(y == img.getHeight() - 1)) {
					img.setRGB(x, y + 1, ((new VectorRGB(img.getRGB(x, y + 1)).add(error.scalarMultiply((float) 3 / 16))).clip(0, 255).toRGB()));
					if (!(x == 0))
						img.setRGB(x - 1, y + 1, ((new VectorRGB(img.getRGB(x - 1, y + 1)).add(error.scalarMultiply((float) 5 / 16)).clip(0, 255).toRGB())));
				}
				/*
				// https://github.com/AfricanSwift/FilterPlay/blob/40b5f73b36b4a75001203792fa72625932d89964/FilterPlay/NSImage%2BDither.swift#L106
				if (!(x == img.getWidth() - 1)) {
					if (!(y == 0))
						img.setRGB(x + 1, y - 1, ((new VectorRGB(img.getRGB(x + 1, y - 1)).add(error.scalarMultiply((float) 1 / 16))).clip(0, 255).toRGB()));
					img.setRGB(x + 1, y, ((new VectorRGB(img.getRGB(x + 1, y)).add(error.scalarMultiply((float) 1 / 16))).clip(0, 255).toRGB()));
				}
				if (!(y == img.getHeight() - 1)) {
					img.setRGB(x, y + 1, ((new VectorRGB(img.getRGB(x, y + 1)).add(error.scalarMultiply((float) 2 / 16))).clip(0, 255).toRGB()));
				}
				*/
			}
		}
	}

	private static class VectorRGB {
		public int r;
		public int g;
		public int b;

		public VectorRGB(int r, int g, int b) {
			this.r = r;
			this.b = b;
			this.g = g;
		}

		public VectorRGB(Color color) {
			this.r = color.getRed();
			this.b = color.getBlue();
			this.g = color.getGreen();
		}

		public VectorRGB(int rgb) {
			Color color = new Color(rgb);
			this.r = color.getRed();
			this.b = color.getBlue();
			this.g = color.getGreen();
		}

		public int toRGB() {
			return new Color(r, g, b).getRGB();
		}

		public VectorRGB subtract(VectorRGB other) {
			return new VectorRGB(this.r - other.r, this.g - other.g, this.b - other.b);
		}

		public VectorRGB add(VectorRGB other) {
			return new VectorRGB(this.r + other.r, this.g + other.g, this.b + other.b);
		}

		public int fastDifferenceTo(VectorRGB other) {
			VectorRGB difference = this.subtract(other);
			return Math.abs(difference.r) + Math.abs(difference.g) + Math.abs(difference.b);
		}

		public VectorRGB scalarMultiply(float scalar) {
			return new VectorRGB((int) (this.r * scalar), (int) (this.g * scalar), (int) (this.b * scalar));
		}

		public VectorRGB clip(int minimum, int maximum) {
			VectorRGB clipped = new VectorRGB(r, g, b);
			if (clipped.r > maximum) {
				clipped.r = maximum;
			} else if (clipped.r < minimum) {
				clipped.r = minimum;
			}
			if (clipped.g > maximum) {
				clipped.g = maximum;
			} else if (clipped.g < minimum) {
				clipped.g = minimum;
			}
			if (clipped.b > maximum) {
				clipped.b = maximum;
			} else if (clipped.b < minimum) {
				clipped.b = minimum;
			}
			return clipped;
		}
	}

	private static class ColorPalette {
		private final VectorRGB[] colors;

		public ColorPalette(Color[] colors) {
			this.colors = new VectorRGB[colors.length];
			for (int i = 0; i < colors.length; i++) {
				this.colors[i] = new VectorRGB(colors[i]);
			}
		}

		public VectorRGB getClosestMatch(VectorRGB color) {
			int minimum_index = 0;
			int minimum_difference = colors[0].fastDifferenceTo(color);
			for (int i = 1; i < colors.length; i++) {
				int current_difference = colors[i].fastDifferenceTo(color);
				if (current_difference < minimum_difference) {
					minimum_difference = current_difference;
					minimum_index = i;
				}
			}
			return colors[minimum_index];
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

	private static final File BANFILE = new File("bans.json");
	private static JsonArray banList;

	static {
		if (BANFILE.exists()) {
			if (BANFILE.isDirectory()) System.exit(1);
			try (FileReader reader = new FileReader(BANFILE)) {
				banList = gson.fromJson(reader, JsonArray.class);
			} catch (IOException e) {
				System.out.println(e.getMessage());
				System.exit(1);
			}
		} else {
			try {
				Files.write(BANFILE.toPath(), Collections.singleton("[]"), StandardCharsets.UTF_8);
				banList = new JsonArray();
			} catch (IOException e) {
				System.out.println(e.getMessage());
				System.exit(1);
			}
		}
	}

	private static void banIP(InetAddress ip, boolean unban) {
		if (unban) {
			for (int i = 0; i < banList.size(); i++)
				if (banList.get(i).getAsString().equals(ip.getHostAddress())) banList.set(i, new JsonPrimitive(0));
			while (banList.contains(new JsonPrimitive(0))) banList.remove(new JsonPrimitive(0));
		} else {
			banList.add(ip.getHostAddress());
		}
		try (FileWriter writer = new FileWriter(BANFILE)) {
			gson.toJson(banList, writer);
		} catch (IOException e) {
			System.out.println(e.getMessage());
		}
	}

	public static void main(String[] args) throws InterruptedException, IOException {
		File settingsFile = new File("settings.json");
		if (settingsFile.isDirectory()) {
			System.exit(1);
			return;
		}
		if (!settingsFile.exists())
			Files.copy(Objects.requireNonNull(Main.class.getResourceAsStream("/settings.json")), Paths.get("settings.json"), StandardCopyOption.REPLACE_EXISTING);
		Reader reader = Files.newBufferedReader(settingsFile.toPath());
		JsonObject settingsJson = gson.fromJson(reader, JsonObject.class);
		reader.close();
		if (tcSecret == null || tcSecret.isEmpty()) tcSecret = settingsJson.has("tripcode_secret") ? settingsJson.get("tripcode_secret").getAsString() : "";
		int port = 8080;
		if (settingsJson.has("port")) port = settingsJson.get("port").getAsInt();
		String host = "127.0.0.1";
		if (settingsJson.has("host")) host = settingsJson.get("host").getAsString();
		if ((secret == null || secret.isEmpty()) && settingsJson.has("secret")) secret = settingsJson.get("secret").getAsString();
		String web;
		if (settingsJson.has("web")) {
			web = settingsJson.get("web").getAsString();
			File webFile = new File(web);
			if (webFile.exists() && !webFile.isDirectory()) {
				System.exit(1);
				return;
			}
			if (!webFile.exists() && webFile.mkdirs()) {
				try {
					copyFromJar("/www", webFile.toPath());
				} catch (URISyntaxException ignored) {
				}
			}
		} else {
			web = null;
		}
		if (settingsJson.has("discord")) {
			JsonObject discordJson = settingsJson.getAsJsonObject("discord");
			if (discordJson.has("enabled") && discordJson.get("enabled").getAsBoolean() && discordJson.has("token") && discordJson.has("channels")) {
				String token = System.getenv("PICTOJAVA_TOKEN");
				if (token == null || token.isEmpty()) token = discordJson.get("token").getAsString();
				JsonArray channels = discordJson.getAsJsonArray("channels");
				JsonElement channelConsoleJsonElement = discordJson.get("consoleChannel");
				if (channelConsoleJsonElement != null) {
					channelConsole = channelConsoleJsonElement.getAsString();
				}
				if (!channels.isEmpty()) {
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
							public void onReady(@NotNull ReadyEvent event) {
								if (!discordJson.has("status_channel")) return;
								String statusChannelId = discordJson.get("status_channel").getAsString();
								if (statusChannelId == null || statusChannelId.isEmpty()) return;
								TextChannel statusChannel = jda.getTextChannelById(statusChannelId);
								if (statusChannel == null) return;
								statusChannel.retrievePinnedMessages().queue(messages -> {
									boolean done = false;
									for (Message message : messages) {
										if (message.getAuthor().getId().equals(jda.getSelfUser().getId())) {
											statusUpdater(message);
											done = true;
											break;
										}
									}
									if (!done) {
										statusChannel.sendMessage("**Loading...**").queue(message -> {
											message.pin().queue(unused -> {
												statusUpdater(message);
											});
										});
									}
								});
							}

							private void statusUpdater(Message statusMessage) {
								new Thread(() -> {
									while (true) { // i just do system.exit so idrc
										try {
											int amt = 0;
											for (Map<JsonObject, ChannelHandlerContext> USERS : ServerHandler.ROOM_CODES.values()) {
												amt += USERS.size();
											}
											statusMessage.editMessage("**List (" + (USERS_A.size() + USERS_B.size() + USERS_C.size() + USERS_D.size() + amt) + ")**").queue();
											List<MessageEmbed> embeds = new ArrayList<>();
											for (int i = 0; i < 4; i++) {
												Map<JsonObject, ChannelHandlerContext> USERS = i == 0 ? USERS_A : (i == 1 ? USERS_B : (i == 2 ? USERS_C : USERS_D));
												Set<JsonObject> players = USERS.keySet();
												StringBuilder resp = new StringBuilder();
												for (JsonObject pl : players) resp.append(pl.get("name").getAsString()).append(" ; ");
												if (resp.length() >= 3) {
													resp.delete(resp.length() - 3, resp.length());
												} else {
													resp.append("(nobody is online)");
												}
												embeds.add(new EmbedBuilder().setTitle((i == 0 ? "Room A" : (i == 1 ? "Room B" : (i == 2 ? "Room C" : "Room D"))) + " (" + players.size() + ")").setDescription(filterMsg(resp.toString())).build());
											}
											embeds.add(new EmbedBuilder().setTitle("Private Rooms (" + amt + ")").build());
											statusMessage.editMessageEmbeds(embeds).queue();
											Set<JsonObject> u = ConcurrentHashMap.newKeySet();
											USERS_A.forEach((jo, ctx) -> {
												if (!ctx.channel().isActive()) {
													u.add(jo);
												}
											});
											for (JsonObject jo : u) {
												USERS_A.remove(jo);
											}
											u.clear();
											USERS_B.forEach((jo, ctx) -> {
												if (!ctx.channel().isActive()) {
													u.add(jo);
												}
											});
											for (JsonObject jo : u) {
												USERS_B.remove(jo);
											}
											u.clear();
											USERS_C.forEach((jo, ctx) -> {
												if (!ctx.channel().isActive()) {
													u.add(jo);
												}
											});
											for (JsonObject jo : u) {
												USERS_C.remove(jo);
											}
											u.clear();
											USERS_D.forEach((jo, ctx) -> {
												if (!ctx.channel().isActive()) {
													u.add(jo);
												}
											});
											for (JsonObject jo : u) {
												USERS_D.remove(jo);
											}
											Set<Map<JsonObject, ChannelHandlerContext>> uuu = ConcurrentHashMap.newKeySet();
											for (Map<JsonObject, ChannelHandlerContext> uu : ServerHandler.ROOM_CODES.values()) {
												u.clear();
												uu.forEach((jo, ctx) -> {
													if (!ctx.channel().isActive()) {
														u.add(jo);
													}
												});
												for (JsonObject jo : u) {
													uu.remove(jo);
												}
												if (uu.isEmpty()) {
													uuu.add(uu);
												}
											}
											u.clear();
											ServerHandler.ROOM_CODES.values().removeAll(uuu);
											uuu.clear();
											Thread.sleep(15000);
										} catch (Exception ignored) {
										}
									}
								}).start();
							}

							@Override
							public void onMessageReceived(@NotNull MessageReceivedEvent event) {
								if (event.getAuthor().isBot()) return;
								StringBuilder content = new StringBuilder(event.getMessage().getContentStripped().trim());
								Set<BufferedImage> imgs = new HashSet<>();
								boolean listCmd = content.toString().equalsIgnoreCase("!list") || content.toString().equalsIgnoreCase("!l");
								if (!listCmd) {
									for (Message.Attachment attachment : event.getMessage().getAttachments()) {
										if (attachment.getContentType() == null || !attachment.getContentType().startsWith("image/")) {
											content.append(" ").append(attachment.getUrl());
											continue;
										}
										int w = attachment.getWidth();
										int h = attachment.getHeight();
										if (w <= 0 || h <= 0) {
											content.append(" ").append(attachment.getUrl());
											continue;
										}
										double a = (double) w / ((double) h / 64.0);
										double b = (double) h / ((double) w / 224.0);
										if (b > 64) {
											w = Math.max(1, (int) a);
											h = 64;
										} else if (a > 224) {
											w = 224;
											h = Math.max(1, (int) b);
										}
										BufferedImage img;
										try {
											InputStream is = attachment.getProxy().download(w, h).join();
											img = ImageIO.read(is);
											is.close();
										} catch (IOException e) {
											content.append(" ").append(attachment.getUrl());
											continue;
										}
										if (img.getWidth() != w || img.getHeight() != h) {
											Image tmp = img.getScaledInstance(w, h, Image.SCALE_FAST);
											img = new BufferedImage(w, h, img.getType());
											Graphics2D g2d = img.createGraphics();
											g2d.drawImage(tmp, 0, 0, null);
											g2d.dispose();
										}
										dither(img);
										imgs.add(img);
									}
								}
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
									if (channelId.equals(channelConsole)) {
										if (!handleConsoleCommand(event.getMessage().getContentStripped().trim(), (String resp) -> event.getMessage().reply(resp).queue())) {
											event.getMessage().reply("You can't stop the server from here!").queue();
										}
									}
									return;
								}
								if (listCmd) {
									Set<JsonObject> players = USERS.keySet();
									StringBuilder resp = new StringBuilder();
									for (JsonObject pl : players) resp.append(pl.get("name").getAsString()).append(" ; ");
									if (resp.length() >= 3) {
										resp.delete(resp.length() - 3, resp.length());
									} else {
										resp.append("(nobody is online)");
									}
									event.getMessage().reply(filterMsg(resp.toString())).queue();
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
									if (lastLine.length() > 37)
										lines[lines.length - 1] = lastLine.substring(0, 37) + "...";
								} else {
									lines = new String[]{content.toString()};
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
								String name = event.getAuthor().getName();
								if (name.length() > 9) name = name.substring(0, 9);
								name += "#";
								player.addProperty("name", name);
								player.addProperty("color", 7506394);
								message.add("player", player);
								jsonObject.add("message", message);
								sendToOthers(null, jsonObject, USERS);
								for (BufferedImage img : imgs) {
									jsonObject = new JsonObject();
									jsonObject.addProperty("type", "sv_receivedMessage");
									message = new JsonObject();
									drawings = new JsonArray();
									drawing = new JsonObject();
									drawing.addProperty("x", 0);
									drawing.addProperty("y", 0);
									drawing.addProperty("type", 4);
									drawings.add(drawing);
									for (int y = 0; y < img.getHeight(); y++) {
										for (int x = 0; x < img.getWidth(); x++) {
											if (img.getRGB(x, y) != fgColor.getRGB()) continue;
											drawing = new JsonObject();
											drawing.addProperty("x", x + 26.5);
											drawing.addProperty("y", y + 227);
											drawing.addProperty("type", 2);
											drawings.add(drawing);
											drawing = new JsonObject();
											drawing.addProperty("x", x + 27.5);
											drawing.addProperty("y", y + 227);
											drawing.addProperty("type", 0);
											drawings.add(drawing);
										}
									}
									message.add("drawing", drawings);
									textboxes = new JsonArray();
									JsonObject textbox = new JsonObject();
									textbox.addProperty("x", 113);
									textbox.addProperty("y", 211);
									textbox.addProperty("text", "(attachment)");
									textboxes.add(textbox);
									message.add("textboxes", textboxes);
									message.addProperty("lines", 5);
									message.add("player", player);
									jsonObject.add("message", message);
									sendToOthers(null, jsonObject, USERS);
								}
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
		ServerBootstrap b = new ServerBootstrap();
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
									ip = ip.split(",", 2)[0];
									Field remoteAddressField = AbstractChannel.class.getDeclaredField("remoteAddress");
									remoteAddressField.setAccessible(true);
									remoteAddressField.set(ctx.channel(), new InetSocketAddress(ip, 0));
								}
								for (JsonElement jsonElement : banList)
									if (jsonElement.getAsString().equals(ip)) {
										ctx.close();
										return;
									}
								if (web == null || (request.headers().contains(HttpHeaderNames.CONNECTION) && request.headers().get(HttpHeaderNames.CONNECTION).toLowerCase().contains("upgrade") && request.headers().contains(HttpHeaderNames.UPGRADE) && request.headers().get(HttpHeaderNames.UPGRADE).toLowerCase().contains("websocket"))) {
									pipeline.addLast("websocket-server-compression-handler", new WebSocketServerCompressionHandler());
									pipeline.addLast("websocket-server-protocol-handler", new WebSocketServerProtocolHandler("/", null, true, 65536));
									pipeline.addLast("websocket-frametojson", new WebSocketFrameToJsonObjectDecoder());
									pipeline.addLast("websocket-jsontoframe", new JsonObjectToWebSocketFrameEncoder());
									pipeline.addLast("server-handler", new ServerHandler());
								} else {
									pipeline.addLast(new HttpStaticFileServerHandler(web));
								}
								if (request instanceof FullHttpRequest) ((FullHttpRequest) request).retain();
								pipeline.fireChannelRead(request);
							}
						});
					}
				}).option(ChannelOption.SO_BACKLOG, 128)
				.childOption(ChannelOption.SO_KEEPALIVE, true);

		System.out.println("Starting ayunpictojava by ayunami2000 on " + host + ":" + port + "!");
		ChannelFuture f = b.bind(host, port);

		if (System.console() == null) {
			f.sync();
			f.channel().closeFuture().sync();
			workerGroup.shutdownGracefully();
			bossGroup.shutdownGracefully();
			jda.shutdown();
			return;
		}

		BufferedReader consoleReader = new BufferedReader(new InputStreamReader(System.in));
		boolean running = true;
		while (running) {
			System.out.print(">");
			running = handleConsoleCommand(consoleReader.readLine(), (String output) -> System.out.println(output));
		}

		System.exit(0); // fack u
		f.channel().closeFuture().sync();
		workerGroup.shutdownGracefully();
		bossGroup.shutdownGracefully();
		jda.shutdown();
	}

	// takes in a command line and a way to print output, returns true for normal commands or unrecognized input and false for an attempt to stop the server
	private static boolean handleConsoleCommand(String cmdstr, Consumer<String> feedbackChannel) {
		if(cmdstr.startsWith("#")) {
			// so people can type human-readable textin the console channels, e.g. to justify a moderation decision
			return true;
		}
		String[] cmd = cmdstr.trim().split(" ");
		boolean ban;
		switch (cmd[0].toLowerCase()) {
			case "help":
				feedbackChannel.accept("Commands: help ; stop ; ban ; banip ; unbanip ; kick ; kickip");
				return true;
			case "stop":
				feedbackChannel.accept("Trying to stop the server...");
				return false;
			case "ban":
			case "kick":
				ban = cmd[0].equalsIgnoreCase("ban");
				if (cmd.length < 3) {
					if (ban) {
						feedbackChannel.accept("Info: Bans the specified user's IP.\nUsage: ban <name> <room>");
					} else {
						feedbackChannel.accept("Info: Kicks the specified user.\nUsage: kick <name> <room>");
					}
					return true;
				}
				Map<JsonObject, ChannelHandlerContext> USERS = getUsersForRoomId(cmd[2]);
				if (USERS == null) {
					feedbackChannel.accept("Invalid room! Please specify one of: \"room_a\" ; \"room_b\" ; \"room_c\" ; \"room_d\" ; \"room_e\"");
					return true;
				}
				boolean done = false;
				for (JsonObject player : USERS.keySet()) {
					if (player.get("name").getAsString().equals(cmd[1])) {
						done = true;
						ChannelHandlerContext ctx = USERS.get(player);
						InetAddress ip = ((InetSocketAddress) ctx.channel().remoteAddress()).getAddress();
						feedbackChannel.accept((ban ? "Bann" : "Kick") + "ing IP: " + ip.getHostAddress());
						if (ban) banIP(ip, false);
						ctx.close();
						return true;
					}
				}
				if (!done)
					for (JsonObject player : USERS.keySet()) {
						if (player.get("name").getAsString().equalsIgnoreCase(cmd[1])) {
							done = true;
							ChannelHandlerContext ctx = USERS.get(player);
							InetAddress ip = ((InetSocketAddress) ctx.channel().remoteAddress()).getAddress();
							feedbackChannel.accept((ban ? "Bann" : "Kick") + "ing IP: " + ip.getHostAddress());
							if (ban) banIP(ip, false);
							ctx.close();
						}
					}
				if (done) {
					feedbackChannel.accept("Done!");
				} else {
					feedbackChannel.accept("Nobody with that name was found in the specified room!");
				}
				return true;
			case "banip":
			case "kickip":
				ban = cmd[0].equalsIgnoreCase("banip");
				if (cmd.length < 2) {
					if (ban) {
						feedbackChannel.accept("Info: Bans the specified IP.\nUsage: banip <ip>");
					} else {
						feedbackChannel.accept("Info: Kicks the specified IP.\nUsage: kick <ip>");
					}
					return true;
				}
				try {
					InetAddress ip = InetAddress.getByName(cmd[1]);
					for (ChannelHandlerContext ctx : USERS_A.values())
						if (((InetSocketAddress) ctx.channel().remoteAddress()).getAddress().equals(ip))
							ctx.close();
					for (ChannelHandlerContext ctx : USERS_B.values())
						if (((InetSocketAddress) ctx.channel().remoteAddress()).getAddress().equals(ip))
							ctx.close();
					for (ChannelHandlerContext ctx : USERS_C.values())
						if (((InetSocketAddress) ctx.channel().remoteAddress()).getAddress().equals(ip))
							ctx.close();
					for (ChannelHandlerContext ctx : USERS_D.values())
						if (((InetSocketAddress) ctx.channel().remoteAddress()).getAddress().equals(ip))
							ctx.close();
					if (ban) banIP(ip, false);
					feedbackChannel.accept("Done!");
				} catch (UnknownHostException e) {
					feedbackChannel.accept("That IP is invalid!");
				}
				return true;
			case "unban":
			case "unbanip":
				if (cmd.length < 2) {
					feedbackChannel.accept("Info: Unbans the specified IP.\nUsage: " + cmd[0].toLowerCase() + " <ip>");
					return true;
				}
				try {
					banIP(InetAddress.getByName(cmd[1]), true);
					feedbackChannel.accept("Done!");
				} catch (UnknownHostException e) {
					feedbackChannel.accept("That IP is invalid!");
				}
				return true;
			default:
				feedbackChannel.accept("Unknown command! Try \"help\" for help.");
				return true;
		}
	}

	static class WebSocketFrameToJsonObjectDecoder extends MessageToMessageDecoder<TextWebSocketFrame> {
		private static final AttributeKey<ScheduledFuture<?>> PING_SCHEDULE = AttributeKey.valueOf("ping-schedule");
		private boolean handshakeReceived = false;

		@Override
		protected void decode(ChannelHandlerContext ctx, TextWebSocketFrame frame, List<Object> out) {
			if (frame.content().readableBytes() > 524288) {
				ctx.close();
				return;
			}
			if (!handshakeReceived && frame.text().equals("handshake")) {
            handshakeReceived = true;
			if (ctx.channel().hasAttr(PING_SCHEDULE)) {
					ctx.channel().attr(PING_SCHEDULE).get().cancel(false);
				}
				// Reschedule ping task
				ctx.channel().attr(PING_SCHEDULE).set(ctx.executor().scheduleAtFixedRate(() -> {
					if (ctx.channel().isActive()) {
						ctx.writeAndFlush(new TextWebSocketFrame("ping"));
					} else {
						ctx.close();
					}
				}, 0, 30, TimeUnit.SECONDS));
				return;
			}
			try {
				out.add(gson.fromJson(frame.text(), JsonObject.class));
			} catch (JsonSyntaxException ignored) {
			}
		}

		@Override
		public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
			super.handlerRemoved(ctx);
			// Cancel ping task when handler is removed
			if (ctx.channel().hasAttr(PING_SCHEDULE)) {
				ctx.channel().attr(PING_SCHEDULE).get().cancel(false);
			}
		}
	}

	static class JsonObjectToWebSocketFrameEncoder extends MessageToMessageEncoder<JsonObject> {
		@Override
		protected void encode(ChannelHandlerContext ctx, JsonObject jsonObject, List<Object> out) {
			out.add(new TextWebSocketFrame(jsonObject.toString()));
		}
	}

	private static String filterMsg(String in) {
		return in.replaceAll("([_*~`|\\\\<>:!])", "\\\\$1").replaceAll("@(everyone|here|[!&]?[0-9]{17,21})", "@\u200b\\\\$1");
	}

	private static final Map<JsonObject, ChannelHandlerContext> USERS_A = new ConcurrentHashMap<>();

	private static final Map<JsonObject, ChannelHandlerContext> USERS_B = new ConcurrentHashMap<>();

	private static final Map<JsonObject, ChannelHandlerContext> USERS_C = new ConcurrentHashMap<>();

	private static final Map<JsonObject, ChannelHandlerContext> USERS_D = new ConcurrentHashMap<>();

	private static void sendToOthers(JsonObject player, JsonObject jsonObject, Map<JsonObject, ChannelHandlerContext> USERS) {
		for (JsonObject user : USERS.keySet()) {
			if (user.equals(player)) continue;
			if (player != null) {
				Channel ch = USERS.get(user).channel();
				if (ch.hasAttr(ServerHandler.IGNORED_PLAYERS)) {
					if (ch.attr(ServerHandler.IGNORED_PLAYERS).get().stream().anyMatch(s -> s.equals(player.get("name").getAsString()))) {
						continue;
					}
				}
			}
			USERS.get(user).writeAndFlush(jsonObject);
		}
	}

	static class ServerHandler extends SimpleChannelInboundHandler<JsonObject> {
		@Override
		public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
			ctx.close();
		}
		//*/

		private static final AttributeKey<JsonObject> PLAYER_DATA = AttributeKey.newInstance("player-data");

		private static final AttributeKey<String> ROOM_ID = AttributeKey.newInstance("room-id");

		private static final AttributeKey<Long> COOLDOWN = AttributeKey.newInstance("cooldown");
		private static final AttributeKey<Integer> RATELIMIT = AttributeKey.newInstance("ratelimit");

		private static final AttributeKey<Long> JOIN_COOLDOWN = AttributeKey.newInstance("join-cooldown");

		private static final AttributeKey<String> PRIVATE_ROOM = AttributeKey.newInstance("private-room");
		protected static final AttributeKey<Set<String>> IGNORED_PLAYERS = AttributeKey.newInstance("ignored-players");

		private static final Map<InetAddress, AtomicInteger> CONS_PER_IP = new ConcurrentHashMap<>();

		private static final Map<String, Map<JsonObject, ChannelHandlerContext>> ROOM_CODES = new ConcurrentHashMap<>();

		private static Font font = null;
		private static final BasicStroke stroke1 = new BasicStroke(1);
		private static final BasicStroke stroke2 = new BasicStroke(2);
		private static final BufferedImage box_bg1;
		private static final BufferedImage box_bg2;
		private static final BufferedImage box_bg3;
		private static final BufferedImage box_bg4;
		private static final BufferedImage box_bg5;
		private static final BufferedImage box_lines1;
		private static final BufferedImage box_lines2;
		private static final BufferedImage box_lines3;
		private static final BufferedImage box_lines4;
		private static final BufferedImage box_lines5;
		private static final BufferedImage box_outline1;
		private static final BufferedImage box_outline2;
		private static final BufferedImage box_outline3;
		private static final BufferedImage box_outline4;
		private static final BufferedImage box_outline5;

		private static BufferedImage loadImage(String name) {
			try {
				return ImageIO.read(Objects.requireNonNull(Main.class.getResourceAsStream("/www/images/" + name + ".png")));
			} catch (IOException e) {
				System.out.println(e.getMessage());
				System.exit(1);
			}
			return null;
		}

		static {
			box_bg1 = loadImage("box_bg1");
			box_bg2 = loadImage("box_bg2");
			box_bg3 = loadImage("box_bg3");
			box_bg4 = loadImage("box_bg4");
			box_bg5 = loadImage("box_bg5");
			box_lines1 = loadImage("box_lines1");
			box_lines2 = loadImage("box_lines2");
			box_lines3 = loadImage("box_lines3");
			box_lines4 = loadImage("box_lines4");
			box_lines5 = loadImage("box_lines5");
			box_outline1 = loadImage("box_outline1");
			box_outline2 = loadImage("box_outline2");
			box_outline3 = loadImage("box_outline3");
			box_outline4 = loadImage("box_outline4");
			box_outline5 = loadImage("box_outline5");
			try {
				font = Font.createFont(Font.TRUETYPE_FONT, Objects.requireNonNull(Main.class.getResourceAsStream("/www/nds.ttf"))).deriveFont(10F);
			} catch (FontFormatException | IOException e) {
				System.err.println("Could not load font!");
			}
		}

		// https://stackoverflow.com/a/3514297
		private static BufferedImage biDeepCopy(BufferedImage bi) {
			ColorModel cm = bi.getColorModel();
			boolean isAlphaPremultiplied = cm.isAlphaPremultiplied();
			WritableRaster raster = bi.copyData(null);
			return new BufferedImage(cm, raster, isAlphaPremultiplied, null);
		}

		// https://stackoverflow.com/a/36744345
		private static void tint(BufferedImage image, Color color, double brightness) {
			for (int x = 0; x < image.getWidth(); x++) {
				for (int y = 0; y < image.getHeight(); y++) {
					Color pixelColor = new Color(image.getRGB(x, y), true);
					int r = (int) ((pixelColor.getRed() + 255 - ((255 - color.getRed()) * brightness)) / 2);
					int g = (int) ((pixelColor.getGreen() + 255 - ((255 - color.getGreen()) * brightness)) / 2);
					int b = (int) ((pixelColor.getBlue() + 255 - ((255 - color.getBlue()) * brightness)) / 2);
					int a = pixelColor.getAlpha();
					int rgba = (a << 24) | (r << 16) | (g << 8) | b;
					image.setRGB(x, y, rgba);
				}
			}
		}

		private boolean playerChecks(JsonObject jsonObject) {
			if (!jsonObject.has("player")) return true;
			JsonObject player = jsonObject.getAsJsonObject("player");
			return !player.has("name") || !player.has("color");
		}

		// https://stackoverflow.com/a/20536597/6917520
		private static String genRoomCode() {
			String chars = "1234567890WERTYUPADFHJKLXCVNM";
			StringBuilder salt = new StringBuilder();
			while (salt.length() < 6) salt.append(chars.charAt(ThreadLocalRandom.current().nextInt(chars.length())));
			return salt.toString();

		}

		@Override
		protected void channelRead0(ChannelHandlerContext ctx, JsonObject jsonObject) {
			if (!jsonObject.has("type")) {
				ctx.close();
				return;
			}
			JsonObject player;
			String roomId;
			JsonObject res;
			Map<JsonObject, ChannelHandlerContext> USERS;
			JsonObject finalPlayer;
			String channel;
			switch (jsonObject.get("type").getAsString()) {
				case "cl_verifyName":
					if (playerChecks(jsonObject)) {
						ctx.close();
						return;
					}
					if (!jsonObject.has("token")) {
						ctx.close();
						return;
					}
					if (!secret.isEmpty()) {
						String token = jsonObject.get("token").getAsString();
						try (AsyncHttpClient asyncHttpClient = Dsl.asyncHttpClient()) {
							InputStream is = asyncHttpClient.preparePost("https://challenges.cloudflare.com/turnstile/v0/siteverify").addFormParam("secret", secret).addFormParam("response", token).execute().toCompletableFuture().join().getResponseBodyAsStream();
							JsonObject resp = gson.fromJson(new InputStreamReader(is), JsonObject.class);
							is.close();
							if (!resp.has("success") || !resp.get("success").getAsBoolean()) {
								ctx.close();
								return;
							}
						} catch (IOException e) {
							System.out.println(e.getMessage());
							ctx.close();
							return;
						}
					}
					player = jsonObject.getAsJsonObject("player");
					String name = player.remove("name").getAsString().replaceAll("[^A-Za-z0-9_]", "");
					if (name.isEmpty()) name = String.valueOf(ThreadLocalRandom.current().nextInt(0, 1000000));
					if (name.length() > 10) name = name.substring(0, 10);
					player.addProperty("name", name);
					int color = player.remove("color").getAsInt();
					if (color < 0 || color > 16777215) color = 0;
					player.addProperty("color", color);
					ctx.channel().attr(PLAYER_DATA).set(player);
					res = new JsonObject();
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
					tmp.add("room_e");
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
					if (!ctx.channel().hasAttr(JOIN_COOLDOWN)) ctx.channel().attr(JOIN_COOLDOWN).set(0L);
					if (ctx.channel().attr(JOIN_COOLDOWN).get() + 5000L > System.currentTimeMillis()) return;
					roomId = jsonObject.get("id").getAsString();
					if (roomId.equals("room_e")) {
						res = new JsonObject();
						res.addProperty("type", "sv_roomData");
						res.addProperty("id", "room_e");
						res.addProperty("private", true);
						ctx.writeAndFlush(res);
						jsonObject = new JsonObject();
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
						JsonObject textbox = new JsonObject();
						textbox.addProperty("x", 113);
						textbox.addProperty("y", 211);
						String privRoomId;
						do {
							privRoomId = genRoomCode();
						} while (ROOM_CODES.containsKey(privRoomId));
						Map<JsonObject, ChannelHandlerContext> map = new ConcurrentHashMap<>();
						map.put(ctx.channel().attr(PLAYER_DATA).get(), ctx);
						ROOM_CODES.put(privRoomId, map);
						ctx.channel().attr(PRIVATE_ROOM).set(privRoomId);
						ctx.channel().attr(ROOM_ID).set(roomId);
						textbox.addProperty("text", "Your room code is: " + privRoomId);
						textboxes.add(textbox);
						textbox = new JsonObject();
						textbox.addProperty("x", 27);
						textbox.addProperty("y", 227);
						textbox.addProperty("text", "!join to go to another");
						textboxes.add(textbox);
						message.add("textboxes", textboxes);
						message.addProperty("lines", 2);
						player = new JsonObject();
						player.addProperty("name", "[SERVER]");
						player.addProperty("color", 51356);
						message.add("player", player);
						jsonObject.add("message", message);
						ctx.writeAndFlush(jsonObject);
						return;
					}
					USERS = getUsersForRoomId(roomId);
					if (USERS == null) return;
					if (USERS.size() >= 16) return;
					player = ctx.channel().attr(PLAYER_DATA).get();
					if (USERS.containsKey(player)) return;
					finalPlayer = player;
					if (USERS.keySet().stream().anyMatch(jsonObject1 -> jsonObject1.get("name").getAsString().equals(finalPlayer.get("name").getAsString()))) return;
					ctx.channel().attr(ROOM_ID).set(roomId);
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
					channel = getDiscordChannelForRoomId(roomId);
					if (channel != null) {
						TextChannel textChannel = jda.getTextChannelById(channel);
						if (textChannel != null)
							textChannel.sendMessage(filterMsg("» " + player.get("name").getAsString())).queue();
					}
					break;
				case "cl_sendMessage":
					if (!ctx.channel().hasAttr(PLAYER_DATA)) {
						ctx.close();
						return;
					}

					if (!ctx.channel().hasAttr(COOLDOWN)) ctx.channel().attr(COOLDOWN).set(System.currentTimeMillis() - 64000L);
					if (!ctx.channel().hasAttr(RATELIMIT)) ctx.channel().attr(RATELIMIT).set(1000);
					if (ctx.channel().attr(COOLDOWN).get() > System.currentTimeMillis()) {
						jsonObject = new JsonObject();
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
						JsonObject textbox = new JsonObject();
						textbox.addProperty("x", 113);
						textbox.addProperty("y", 211);
						textbox.addProperty("text", "Ratelimited: Please wait " + (1 + (int) (ctx.channel().attr(COOLDOWN).get() - System.currentTimeMillis()) / 1000) + "s");
						textboxes.add(textbox);
						message.add("textboxes", textboxes);
						message.addProperty("lines", 1);
						player = new JsonObject();
						player.addProperty("name", "[SERVER]");
						player.addProperty("color", 16463656);
						message.add("player", player);
						jsonObject.add("message", message);
						ctx.writeAndFlush(jsonObject);
						return;
					} else {
						if (System.currentTimeMillis() - ctx.channel().attr(COOLDOWN).get() < 1000) {
							ctx.channel().attr(RATELIMIT).set(Math.min(32000, ctx.channel().attr(RATELIMIT).get() * 2));
						} else {
							ctx.channel().attr(RATELIMIT).set(1000);
						}
						ctx.channel().attr(COOLDOWN).set(System.currentTimeMillis() + ctx.channel().attr(RATELIMIT).get());
					}
					roomId = ctx.channel().attr(ROOM_ID).get();
					if (roomId == null) return;
					if (roomId.equals("room_e")) {
						USERS = ROOM_CODES.get(ctx.channel().attr(PRIVATE_ROOM).get());
					} else {
						USERS = getUsersForRoomId(roomId);
					}
					if (USERS == null) return;
					if (!jsonObject.has("message") || playerChecks(jsonObject.getAsJsonObject("message")) || !jsonObject.getAsJsonObject("message").has("textboxes") || !jsonObject.getAsJsonObject("message").has("lines") || jsonObject.getAsJsonObject("message").get("lines").getAsInt() > 5 || jsonObject.getAsJsonObject("message").get("lines").getAsInt() <= 0) {
						ctx.close();
						return;
					}
					StringBuilder textRawBuilder = new StringBuilder();
					JsonArray textboxes = jsonObject.getAsJsonObject("message").remove("textboxes").getAsJsonArray();
					JsonArray textboxesOut = new JsonArray();
					for (JsonElement textbox : textboxes) {
						if (!textbox.isJsonObject()) continue;
						JsonObject textboxObject = (JsonObject) textbox;
						if (textboxObject.has("text") && textboxObject.has("x") && textboxObject.has("y")) {
							String text = textboxObject.remove("text").getAsString();
							if (text == null) continue;
							if (text.length() > 255) text = text.substring(0, 255);
							double x = Math.max(13.0, Math.min(256.0, textboxObject.remove("x").getAsDouble()));
							double y = Math.max(204.0, Math.min(274.0, textboxObject.remove("y").getAsDouble()));
							if (x <= 110.0 && y <= 226.0) {
								x = 110.0;
								y = 226.0;
							}
							boolean duplicate = false;
							for (JsonElement jsonElement : textboxesOut) {
								JsonObject jsonObject1 = jsonElement.getAsJsonObject();
								if (jsonObject1.get("x").getAsDouble() == x && jsonObject1.get("y").getAsDouble() == y && jsonObject1.get("text").getAsString().equals(text)) {
									duplicate = true;
									break;
								}
							}
							if (duplicate) continue;
							textboxObject.addProperty("x", x);
							textboxObject.addProperty("y", y);
							textboxObject.addProperty("text", text);
							textboxesOut.add(textboxObject);
							textRawBuilder.append("\n").append(text);
							if (textboxesOut.size() > 255) break;
						}
					}
					String textRaw = textRawBuilder.toString().trim();
					if (roomId.equals("room_e")) {
						if (textRaw.equalsIgnoreCase("!join")) {
							jsonObject = new JsonObject();
							jsonObject.addProperty("type", "sv_receivedMessage");
							JsonObject message = new JsonObject();
							JsonArray drawings = new JsonArray();
							JsonObject drawing = new JsonObject();
							drawing.addProperty("x", 0);
							drawing.addProperty("y", 0);
							drawing.addProperty("type", 3);
							drawings.add(drawing);
							message.add("drawing", drawings);
							textboxes = new JsonArray();
							JsonObject textbox = new JsonObject();
							textbox.addProperty("x", 113);
							textbox.addProperty("y", 211);
							textbox.addProperty("text", "Usage: !join <code>");
							textboxes.add(textbox);
							message.add("textboxes", textboxes);
							message.addProperty("lines", 1);
							player = new JsonObject();
							player.addProperty("name", "[SERVER]");
							player.addProperty("color", 51356);
							message.add("player", player);
							jsonObject.add("message", message);
							ctx.writeAndFlush(jsonObject);
							return;
						} else if (textRaw.toLowerCase().startsWith("!join ")) {
							String privRoomId = textRaw.replace("\n", "").substring(6, Math.min(12, textRaw.length())).toUpperCase();
							if (ROOM_CODES.containsKey(privRoomId)) {
								if (privRoomId.equals(ctx.channel().attr(PRIVATE_ROOM).get())) {
									jsonObject = new JsonObject();
									jsonObject.addProperty("type", "sv_receivedMessage");
									JsonObject message = new JsonObject();
									JsonArray drawings = new JsonArray();
									JsonObject drawing = new JsonObject();
									drawing.addProperty("x", 0);
									drawing.addProperty("y", 0);
									drawing.addProperty("type", 3);
									drawings.add(drawing);
									message.add("drawing", drawings);
									textboxes = new JsonArray();
									JsonObject textbox = new JsonObject();
									textbox.addProperty("x", 113);
									textbox.addProperty("y", 211);
									textbox.addProperty("text", "Already there!");
									textboxes.add(textbox);
									message.add("textboxes", textboxes);
									message.addProperty("lines", 1);
									player = new JsonObject();
									player.addProperty("name", "[SERVER]");
									player.addProperty("color", 51356);
									message.add("player", player);
									jsonObject.add("message", message);
									ctx.writeAndFlush(jsonObject);
									return;
								}
								if (ROOM_CODES.get(privRoomId).size() >= 16) {
									jsonObject = new JsonObject();
									jsonObject.addProperty("type", "sv_receivedMessage");
									JsonObject message = new JsonObject();
									JsonArray drawings = new JsonArray();
									JsonObject drawing = new JsonObject();
									drawing.addProperty("x", 0);
									drawing.addProperty("y", 0);
									drawing.addProperty("type", 3);
									drawings.add(drawing);
									message.add("drawing", drawings);
									textboxes = new JsonArray();
									JsonObject textbox = new JsonObject();
									textbox.addProperty("x", 113);
									textbox.addProperty("y", 211);
									textbox.addProperty("text", "Room is full!");
									textboxes.add(textbox);
									message.add("textboxes", textboxes);
									message.addProperty("lines", 1);
									player = new JsonObject();
									player.addProperty("name", "[SERVER]");
									player.addProperty("color", 51356);
									message.add("player", player);
									jsonObject.add("message", message);
									ctx.writeAndFlush(jsonObject);
									return;
								}
								finalPlayer = ctx.channel().attr(PLAYER_DATA).get();
								if (ROOM_CODES.get(privRoomId).keySet().stream().anyMatch(jsonObject1 -> jsonObject1.get("name").getAsString().equals(finalPlayer.get("name").getAsString()))) {
									jsonObject = new JsonObject();
									jsonObject.addProperty("type", "sv_receivedMessage");
									JsonObject message = new JsonObject();
									JsonArray drawings = new JsonArray();
									JsonObject drawing = new JsonObject();
									drawing.addProperty("x", 0);
									drawing.addProperty("y", 0);
									drawing.addProperty("type", 3);
									drawings.add(drawing);
									message.add("drawing", drawings);
									textboxes = new JsonArray();
									JsonObject textbox = new JsonObject();
									textbox.addProperty("x", 113);
									textbox.addProperty("y", 211);
									textbox.addProperty("text", "Duplicate name!");
									textboxes.add(textbox);
									message.add("textboxes", textboxes);
									message.addProperty("lines", 1);
									player = new JsonObject();
									player.addProperty("name", "[SERVER]");
									player.addProperty("color", 51356);
									message.add("player", player);
									jsonObject.add("message", message);
									ctx.writeAndFlush(jsonObject);
									return;
								}
								jsonObject = new JsonObject();
								jsonObject.addProperty("type", "sv_receivedMessage");
								JsonObject message = new JsonObject();
								JsonArray drawings = new JsonArray();
								JsonObject drawing = new JsonObject();
								drawing.addProperty("x", 0);
								drawing.addProperty("y", 0);
								drawing.addProperty("type", 3);
								drawings.add(drawing);
								message.add("drawing", drawings);
								textboxes = new JsonArray();
								JsonObject textbox = new JsonObject();
								textbox.addProperty("x", 113);
								textbox.addProperty("y", 211);
								textbox.addProperty("text", "Joined room: " + privRoomId);
								textboxes.add(textbox);
								message.add("textboxes", textboxes);
								message.addProperty("lines", 1);
								player = new JsonObject();
								player.addProperty("name", "[SERVER]");
								player.addProperty("color", 51356);
								message.add("player", player);
								jsonObject.add("message", message);
								ctx.writeAndFlush(jsonObject);
								player = ctx.channel().attr(PLAYER_DATA).get();
								String oldPrivRoomId = ctx.channel().attr(PRIVATE_ROOM).get();
								USERS.remove(player);
								if (USERS.isEmpty()) {
									ROOM_CODES.remove(oldPrivRoomId);
								} else {
									jsonObject = new JsonObject();
									jsonObject.addProperty("type", "sv_playerLeft");
									jsonObject.add("player", player);
									jsonObject.addProperty("id", roomId);
									sendToOthers(player, jsonObject, USERS);
								}
								ctx.channel().attr(PRIVATE_ROOM).set(privRoomId);
								ROOM_CODES.get(privRoomId).put(player, ctx);
								res = new JsonObject();
								res.addProperty("type", "sv_playerJoined");
								res.add("player", player);
								res.addProperty("id", roomId);
								sendToOthers(player, res, ROOM_CODES.get(privRoomId));
							} else {
								jsonObject = new JsonObject();
								jsonObject.addProperty("type", "sv_receivedMessage");
								JsonObject message = new JsonObject();
								JsonArray drawings = new JsonArray();
								JsonObject drawing = new JsonObject();
								drawing.addProperty("x", 0);
								drawing.addProperty("y", 0);
								drawing.addProperty("type", 3);
								drawings.add(drawing);
								message.add("drawing", drawings);
								textboxes = new JsonArray();
								JsonObject textbox = new JsonObject();
								textbox.addProperty("x", 113);
								textbox.addProperty("y", 211);
								textbox.addProperty("text", "Room not found!");
								textboxes.add(textbox);
								message.add("textboxes", textboxes);
								message.addProperty("lines", 1);
								player = new JsonObject();
								player.addProperty("name", "[SERVER]");
								player.addProperty("color", 51356);
								message.add("player", player);
								jsonObject.add("message", message);
								ctx.writeAndFlush(jsonObject);
							}
							return;
						}
					}
					if (textRaw.equalsIgnoreCase("!list") || textRaw.equalsIgnoreCase("!l")) {
						jsonObject = new JsonObject();
						jsonObject.addProperty("type", "sv_receivedMessage");
						JsonObject message = new JsonObject();
						JsonArray drawings = new JsonArray();
						JsonObject drawing = new JsonObject();
						drawing.addProperty("x", 0);
						drawing.addProperty("y", 0);
						drawing.addProperty("type", 3);
						drawings.add(drawing);
						message.add("drawing", drawings);
						textboxes = new JsonArray();
						Set<JsonObject> players = USERS.keySet();
						StringBuilder content = new StringBuilder();
						for (JsonObject pl : players) content.append(pl.get("name").getAsString()).append(" ; ");
						if (content.length() >= 3) {
							content.delete(content.length() - 3, content.length());
						} else {
							content.append("(nobody is online)");
						}
						String[] lines;
						if (content.length() > 25) {
							String firstLine = content.substring(0, 25);
							String[] lastLines = content.substring(25).split("(?<=\\G.{40})", 4);
							lines = new String[lastLines.length + 1];
							System.arraycopy(lastLines, 0, lines, 1, lastLines.length);
							lines[0] = firstLine;
							String lastLine = lines[lines.length - 1];
							if (lastLine.length() > 37)
								lines[lines.length - 1] = lastLine.substring(0, 37) + "...";
						} else {
							lines = new String[]{content.toString()};
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
						player = new JsonObject();
						player.addProperty("name", "[SERVER]");
						player.addProperty("color", 51356);
						message.add("player", player);
						jsonObject.add("message", message);
						ctx.writeAndFlush(jsonObject);
						return;
					}
					if ((textRaw.toLowerCase().startsWith("!block ") && textRaw.length() > 7) || (textRaw.toLowerCase().startsWith("!ignore ") && textRaw.length() > 8) || (textRaw.toLowerCase().startsWith("!unblock ") && textRaw.length() > 9) || (textRaw.toLowerCase().startsWith("!unignore ") && textRaw.length() > 10)) {
						if (!ctx.channel().hasAttr(IGNORED_PLAYERS)) {
							ctx.channel().attr(IGNORED_PLAYERS).set(ConcurrentHashMap.newKeySet());
						}
						String target = textRaw.replace("\n", "").substring(textRaw.indexOf(' ') + 1);
						if (target.length() > 10) {
							target = target.substring(0, 10);
						}
						Set<String> ignored = ctx.channel().attr(IGNORED_PLAYERS).get();
						String finalTarget = target;
						boolean removed = ignored.removeIf(s -> s.equals(finalTarget));
						if (!removed) {
							ignored.add(target);
						}
						jsonObject = new JsonObject();
						jsonObject.addProperty("type", "sv_receivedMessage");
						JsonObject message = new JsonObject();
						JsonArray drawings = new JsonArray();
						JsonObject drawing = new JsonObject();
						drawing.addProperty("x", 0);
						drawing.addProperty("y", 0);
						drawing.addProperty("type", 3);
						drawings.add(drawing);
						message.add("drawing", drawings);
						textboxes = new JsonArray();
						JsonObject textbox = new JsonObject();
						textbox.addProperty("x", 113);
						textbox.addProperty("y", 211);
						textbox.addProperty("text", (removed ? "Unb" : "B") + "locked: " + target);
						textboxes.add(textbox);
						message.add("textboxes", textboxes);
						message.addProperty("lines", 1);
						player = new JsonObject();
						player.addProperty("name", "[SERVER]");
						player.addProperty("color", 51356);
						message.add("player", player);
						jsonObject.add("message", message);
						ctx.writeAndFlush(jsonObject);
						return;
					}
					player = ctx.channel().attr(PLAYER_DATA).get();
					boolean tcCmd = textRaw.toLowerCase().startsWith("!tripcode ") || textRaw.toLowerCase().startsWith("!tc ") || textRaw.toLowerCase().startsWith("!tripcode\n") || textRaw.toLowerCase().startsWith("!tc\n");
					if (tcCmd) {
						int fard = textRaw.indexOf(" ");
						int fard2 = textRaw.indexOf("\n");
						if (fard == -1 || (fard2 != -1 && fard2 < fard)) {
							fard = fard2;
						}
						String pass = textRaw.substring(fard + 1).trim();
						String hash;
						try {
							hash = new BigInteger(1, MessageDigest.getInstance("SHA-256").digest((tcSecret + pass).getBytes(StandardCharsets.UTF_8))).toString(36);
						} catch (NoSuchAlgorithmException e) {
							hash = e.getMessage();
						}
						String tenName = player.get("name").getAsString();
						if (tenName.length() < 10) {
							tenName = tenName + new String(new char[10 - tenName.length()]).replace("\0", " ");
						}
						player = player.deepCopy();
						player.remove("name");
						player.addProperty("name", "[SERVER]");
						StringBuilder content = new StringBuilder("Tripcode for ").append(tenName).append(": ").append(hash);
						textRaw = content.toString();
						textboxesOut = new JsonArray();
						String[] lines;
						if (content.length() > 25) {
							String firstLine = content.substring(0, 25);
							String[] lastLines = content.substring(25).split("(?<=\\G.{40})", 4);
							lines = new String[lastLines.length + 1];
							System.arraycopy(lastLines, 0, lines, 1, lastLines.length);
							lines[0] = firstLine;
							String lastLine = lines[lines.length - 1];
							if (lastLine.length() > 37)
								lines[lines.length - 1] = lastLine.substring(0, 37) + "...";
						} else {
							lines = new String[]{content.toString()};
						}
						for (int i = 0; i < lines.length; i++) {
							JsonObject textbox = new JsonObject();
							textbox.addProperty("x", i == 0 ? 113 : 27);
							textbox.addProperty("y", 211 + i * 16);
							textbox.addProperty("text", lines[i]);
							textboxesOut.add(textbox);
						}
						jsonObject.getAsJsonObject("message").remove("lines");
						jsonObject.getAsJsonObject("message").addProperty("lines", lines.length);
						jsonObject.getAsJsonObject("message").remove("drawing");
						JsonArray drawings = new JsonArray();
						JsonObject drawing = new JsonObject();
						drawing.addProperty("x", 0);
						drawing.addProperty("y", 0);
						drawing.addProperty("type", 3);
						drawings.add(drawing);
						jsonObject.getAsJsonObject("message").add("drawing", drawings);
					}
					jsonObject.remove("type");
					jsonObject.addProperty("type", "sv_receivedMessage");
					jsonObject.getAsJsonObject("message").remove("player");
					jsonObject.getAsJsonObject("message").add("player", player);
					jsonObject.getAsJsonObject("message").add("textboxes", textboxesOut);
					sendToOthers(tcCmd ? null : player, jsonObject, USERS);
					channel = getDiscordChannelForRoomId(roomId);
					if (channel != null) {
						TextChannel textChannel = jda.getTextChannelById(channel);
						if (textChannel != null) {
							if (!textRaw.isEmpty())
								textChannel.sendMessage(filterMsg(player.get("name").getAsString() + " » " + textRaw)).queue();
							if (jsonObject.getAsJsonObject("message").has("drawing")) {
								long startTime = System.currentTimeMillis();
								JsonArray drawing = jsonObject.getAsJsonObject("message").getAsJsonArray("drawing");
								if (System.currentTimeMillis() - startTime > 5000) {
									ctx.close();
									return;
								}
								int lines = jsonObject.getAsJsonObject("message").get("lines").getAsInt();
								BufferedImage box_bg;
								BufferedImage box_lines;
								BufferedImage box_outline;
								switch (lines) {
									case 1:
										box_bg = box_bg1;
										box_lines = box_lines1;
										box_outline = box_outline1;
										break;
									case 2:
										box_bg = box_bg2;
										box_lines = box_lines2;
										box_outline = box_outline2;
										break;
									case 3:
										box_bg = box_bg3;
										box_lines = box_lines3;
										box_outline = box_outline3;
										break;
									case 4:
										box_bg = box_bg4;
										box_lines = box_lines4;
										box_outline = box_outline4;
										break;
									case 5:
										box_bg = box_bg5;
										box_lines = box_lines5;
										box_outline = box_outline5;
										break;
									default:
										return;
								}
								BufferedImage drawingImage = biDeepCopy(box_bg);
								Graphics2D g2d = drawingImage.createGraphics();
								g2d.setBackground(fgColor);
								Color col = new Color(player.get("color").getAsInt());
								box_lines = biDeepCopy(box_lines);
								tint(box_lines, col, 0.75);
								g2d.drawImage(box_lines, 0, 0, null);
								box_outline = biDeepCopy(box_outline);
								tint(box_outline, col, 1);
								g2d.drawImage(box_outline, 0, 0, null);
								g2d.setColor(col);
								g2d.setStroke(stroke1);
								if (font == null) {
									g2d.setFont(g2d.getFont().deriveFont(12F));
								} else {
									g2d.setFont(font);
								}
								g2d.drawString(player.get("name").getAsString(), 6, 16);
								g2d.setColor(fgColor);
								GeneralPath polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
								polyline.moveTo(0, 0);
								boolean rainbow = false;
								int rainbowDeg = 348;
								for (JsonElement jsonElement : drawing) {
									if (!jsonElement.isJsonObject()) continue;
									JsonObject drawingObj = jsonElement.getAsJsonObject();
									if (!drawingObj.has("type")) continue;
									if (!drawingObj.has("x")) continue;
									if (!drawingObj.has("y")) continue;
									int type = Math.max(-1, Math.min(7, drawingObj.get("type").getAsInt()));
									double x = Math.max(0.0, Math.min(232.0, drawingObj.get("x").getAsDouble() - 22.0));
									double y = Math.max(0.0, Math.min(83.0, drawingObj.get("y").getAsDouble() - 208.0));
									if (x <= 88.0 && y <= 18.0) {
										x = 88.0;
										y = 18.0;
									}
									Point2D point;
									switch (type) {
										case -1:
											break;
										case 0:
											if (rainbow) {
												point = polyline.getCurrentPoint();
												if (point != null) {
													g2d.draw(polyline);
													polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
													polyline.moveTo(point.getX(), point.getY());
												}
												rainbowDeg = (rainbowDeg + 12) % 360;
												g2d.setColor(Color.getHSBColor(rainbowDeg / 360F, 1F, 1F));
											}
											polyline.lineTo(x, y);
											break;
										case 1:
										case 2:
											polyline.moveTo(x, y);
											break;
										case 3:
											point = polyline.getCurrentPoint();
											if (point != null) {
												g2d.draw(polyline);
												polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
												polyline.moveTo(point.getX(), point.getY());
											}
											g2d.setStroke(stroke2);
											break;
										case 4:
											point = polyline.getCurrentPoint();
											if (point != null) {
												g2d.draw(polyline);
												polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
												polyline.moveTo(point.getX(), point.getY());
											}
											g2d.setStroke(stroke1);
											break;
										case 5:
											point = polyline.getCurrentPoint();
											if (point != null) {
												g2d.draw(polyline);
												polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
												polyline.moveTo(point.getX(), point.getY());
											}
											g2d.setColor(fgColor);
											rainbow = false;
											break;
										case 6:
											point = polyline.getCurrentPoint();
											if (point != null) {
												g2d.draw(polyline);
												polyline = new GeneralPath(GeneralPath.WIND_EVEN_ODD);
												polyline.moveTo(point.getX(), point.getY());
											}
											g2d.setColor(bgColor);
											rainbow = false;
											break;
										case 7:
											rainbow = true;
											break;
									}
									if (System.currentTimeMillis() - startTime > 5000) {
										ctx.close();
										return;
									}
								}
								g2d.draw(polyline);
								g2d.setStroke(stroke1);
								g2d.setColor(fgColor);
								if (System.currentTimeMillis() - startTime > 5000) {
									ctx.close();
									return;
								}
								for (JsonElement jsonElement : textboxesOut) {
									if (!jsonElement.isJsonObject()) continue;
									JsonObject textboxObj = jsonElement.getAsJsonObject();
									if (!textboxObj.has("text")) continue;
									if (!textboxObj.has("x")) continue;
									if (!textboxObj.has("y")) continue;
									String text = textboxObj.get("text").getAsString();
									double x = textboxObj.get("x").getAsDouble() - 22;
									double y = textboxObj.get("y").getAsDouble() - 208;
									g2d.drawString(text, (float) x, (float) y + 12);
									if (System.currentTimeMillis() - startTime > 5000) {
										ctx.close();
										return;
									}
								}
								ByteArrayOutputStream baos = new ByteArrayOutputStream();
								try {
									ImageIO.write(drawingImage, "PNG", baos);
									textChannel.sendFiles(FileUpload.fromData(baos.toByteArray(), "drawing.png")).queue();
								} catch (IOException ignored) {
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
					if (roomId.equals("room_e")) {
						String privRoomId = ctx.channel().attr(PRIVATE_ROOM).get();
						Map<JsonObject, ChannelHandlerContext> u = ROOM_CODES.get(privRoomId);
						u.remove(ctx.channel().attr(PLAYER_DATA).get());
						if (u.isEmpty()) {
							ROOM_CODES.remove(privRoomId);
						} else {
							player = ctx.channel().attr(PLAYER_DATA).get();
							jsonObject = new JsonObject();
							jsonObject.addProperty("type", "sv_playerLeft");
							jsonObject.add("player", player);
							jsonObject.addProperty("id", roomId);
							sendToOthers(player, jsonObject, u);
						}
						return;
					}
					USERS = getUsersForRoomId(roomId);
					if (USERS == null) return;
					player = ctx.channel().attr(PLAYER_DATA).get();
					if (USERS.containsKey(player)) {
						USERS.remove(player);
						ctx.channel().attr(JOIN_COOLDOWN).set(System.currentTimeMillis());
						JsonObject jsonObject1 = new JsonObject();
						jsonObject1.addProperty("type", "sv_playerLeft");
						jsonObject1.add("player", player);
						jsonObject1.addProperty("id", roomId);
						sendToOthers(player, jsonObject1, USERS);
					}
					channel = getDiscordChannelForRoomId(roomId);
					if (channel != null) {
						TextChannel textChannel = jda.getTextChannelById(channel);
						if (textChannel != null)
							textChannel.sendMessage(filterMsg("« " + player.get("name").getAsString())).queue();
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
			}
		}

		@Override
		public void channelInactive(ChannelHandlerContext ctx) throws Exception {
			InetAddress ip = ((InetSocketAddress) ctx.channel().remoteAddress()).getAddress();
			super.channelInactive(ctx);
			if (CONS_PER_IP.containsKey(ip) && CONS_PER_IP.get(ip).decrementAndGet() == 0) CONS_PER_IP.remove(ip);
			if (ctx.channel().hasAttr(PLAYER_DATA)) {
				String roomId = ctx.channel().attr(ROOM_ID).get();
				if (roomId == null) return;
				if (roomId.equals("room_e")) {
					String privRoomId = ctx.channel().attr(PRIVATE_ROOM).get();
					Map<JsonObject, ChannelHandlerContext> u = ROOM_CODES.get(privRoomId);
					u.remove(ctx.channel().attr(PLAYER_DATA).get());
					if (u.isEmpty()) {
						ROOM_CODES.remove(privRoomId);
					} else {
						JsonObject player = ctx.channel().attr(PLAYER_DATA).get();
						JsonObject jsonObject = new JsonObject();
						jsonObject.addProperty("type", "sv_playerLeft");
						jsonObject.add("player", player);
						jsonObject.addProperty("id", roomId);
						sendToOthers(player, jsonObject, u);
					}
					return;
				}
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
					if (textChannel != null)
						textChannel.sendMessage(filterMsg("« " + player.get("name").getAsString())).queue();
				}
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
