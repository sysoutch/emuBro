package ch.sysout.emubro;

import static io.netty.handler.codec.http.HttpResponseStatus.CONTINUE;
import static io.netty.handler.codec.http.HttpResponseStatus.OK;
import static io.netty.handler.codec.http.HttpVersion.HTTP_1_1;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.Charset;
import java.util.List;

import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.emubro.api.model.Game;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.model.BroExplorer;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelOutboundInvoker;
import io.netty.handler.codec.http.DefaultFullHttpResponse;
import io.netty.handler.codec.http.FullHttpResponse;
import io.netty.handler.codec.http.HttpHeaderNames;
import io.netty.handler.codec.http.HttpHeaderValues;
import io.netty.handler.codec.http.HttpMessage;
import io.netty.handler.codec.http.HttpRequest;
import io.netty.handler.codec.http.HttpResponse;
import io.netty.handler.codec.http.HttpUtil;
import io.netty.handler.codec.http.websocketx.WebSocketFrame;

public class HttpHelloWorldServerHandler extends ChannelInboundHandlerAdapter {
	private BroExplorer explorer;
	private long onlineSince;
	private String serverVersion = "0.0.1";

	public HttpHelloWorldServerHandler(BroExplorer explorer) {
		this.explorer = explorer;
		onlineSince = System.currentTimeMillis();
	}

	@Override
	public void channelReadComplete(ChannelHandlerContext ctx) {
		ctx.flush();
	}

	@Override
	public void channelRead(ChannelHandlerContext ctx, Object msg) {
		if (msg instanceof HttpRequest) {
			handleHttpRequest(ctx, (HttpRequest) msg);
		} else if (msg instanceof WebSocketFrame) {
			handleWebSocketFrame(ctx, (WebSocketFrame) msg);
		}
	}

	private void handleHttpRequest(ChannelHandlerContext ctx, HttpRequest req) {
		// Allow only GET methods.
		//		if (req.method() != GET) {
		//			sendHttpResponse(ctx, req, new DefaultHttpResponse(HTTP_1_1, FORBIDDEN));
		//			return;
		//		}

		// Send the demo page and favicon.ico
		if (req.uri().equals("/")) {
			//			HttpResponse res = new DefaultHttpResponse(HTTP_1_1, OK);
			//			ChannelBuffer content = WebSocketServerIndexPage.getContent(getWebSocketLocation(req));
			//			res.setHeader(CONTENT_TYPE, "text/html; charset=UTF-8");
			//			setContentLength(res, content.readableBytes());
			//			res.setContent(content);

			partOne(req, ctx);
			String content = getJson();
			boolean keepAlive = HttpUtil.isKeepAlive(req);
			partTwo(content, keepAlive, ctx);
			return;
		} else if (req.uri().startsWith("/games.json")) {
			partOne(req, ctx);
			String content = getJson2(req.uri());
			boolean keepAlive = HttpUtil.isKeepAlive(req);
			partTwo(content, keepAlive, ctx);
		} else if (req.uri().equals("platforms.json")) {
			partOne(req, ctx);
			String content = getJson3();
			boolean keepAlive = HttpUtil.isKeepAlive(req);
			partTwo(content, keepAlive, ctx);
		} else if (req.uri().equals("/favicon.ico")) {
			//			HttpResponse res = new DefaultHttpResponse(HTTP_1_1, NOT_FOUND);
			//			sendHttpResponse(ctx, req, res);
			return;
		}

		// Handshake
		//		WebSocketServerHandshakerFactory wsFactory = new WebSocketServerHandshakerFactory(
		//				this.getWebSocketLocation(req), null, false);
		//		handshaker = wsFactory.newHandshaker(req);
		//		if (handshaker == null) {
		//			wsFactory.sendUnsupportedWebSocketVersionResponse(ctx.getChannel());
		//		} else {
		//			handshaker.handshake(ctx.getChannel(), req);
		//		}
	}

	private void partTwo(String content, boolean keepAlive, ChannelOutboundInvoker ctx) {
		FullHttpResponse response = new DefaultFullHttpResponse(HTTP_1_1, OK, Unpooled.wrappedBuffer(content.getBytes()));
		response.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/json");
		response.headers().set(HttpHeaderNames.CONTENT_LENGTH, response.content().readableBytes());

		if (!keepAlive) {
			ctx.write(response).addListener(ChannelFutureListener.CLOSE);
		} else {
			response.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.KEEP_ALIVE);
			ctx.write(response);
		}
		//		sendHttpResponse(ctx, req, response);
		return;
	}

	private void partOne(HttpMessage req, ChannelOutboundInvoker ctx) {
		if (HttpUtil.is100ContinueExpected(req)) {
			ctx.write(new DefaultFullHttpResponse(HTTP_1_1, CONTINUE));
		}
	}

	private String getJson() {
		String json = "{\r\n" +
				"  serverVersion: \"" + serverVersion + "\",\r\n" +
				"  onlineSince: " + onlineSince + ",\r\n" +
				"  games: \"games.json\",\r\n" +
				"  platforms: \"platforms.json\",\r\n" +
				"  gameCount: \""+explorer.getGameCount()+"\"\r\n" +
				"}";
		return json;
	}

	private String getJson2(String string) {
		Gson gson = new GsonBuilder().setPrettyPrinting().create();
		Type listType = new TypeToken<List<Game>>() {}.getType();

		String url = string;
		List<NameValuePair> params;
		try {
			params = URLEncodedUtils.parse(new URI(url), Charset.forName("UTF-8"));
			for (NameValuePair param : params) {
				if (param.getName().equals("platform")) {
					int platformId = Integer.valueOf(param.getValue());
					String json = gson.toJson(explorer.getGamesFromPlatform(platformId), listType);
					return json;
				}
				if (param.getName().equals("tag")) {
					Tag tag = explorer.getTag(param.getValue());
					String json = gson.toJson(explorer.getGamesForTags(tag), listType);
					return json;
				}
				System.out.println(param.getName() + " : " + param.getValue());
			}
		} catch (URISyntaxException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		String json = gson.toJson(explorer.getGames(), listType);
		return json;
	}

	private String getJson3() {
		Gson gson = new GsonBuilder().setPrettyPrinting().create();
		Type listType = new TypeToken<Emulator>() {}.getType();
		String json = gson.toJson(explorer.getEmulatorFromPlatform(0), listType);
		return json;
	}

	private void sendHttpResponse(ChannelHandlerContext ctx, HttpRequest req, HttpResponse res) {
		// TODO Auto-generated method stub

	}

	private void handleHttpRequest2(ChannelHandlerContext ctx, HttpRequest msg) {
		HttpRequest req = msg;

		if (HttpUtil.is100ContinueExpected(req)) {
			ctx.write(new DefaultFullHttpResponse(HTTP_1_1, CONTINUE));
		}
		boolean keepAlive = HttpUtil.isKeepAlive(req);

		String content = getJson();

		FullHttpResponse response = new DefaultFullHttpResponse(HTTP_1_1, OK, Unpooled.wrappedBuffer(content.getBytes()));
		response.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/json");
		response.headers().set(HttpHeaderNames.CONTENT_LENGTH, response.content().readableBytes());

		if (!keepAlive) {
			ctx.write(response).addListener(ChannelFutureListener.CLOSE);
		} else {
			response.headers().set(HttpHeaderNames.CONNECTION, HttpHeaderValues.KEEP_ALIVE);
			ctx.write(response);
		}
	}

	private void handleWebSocketFrame(ChannelHandlerContext ctx, WebSocketFrame msg) {
		// TODO Auto-generated method stub
		System.out.println("handleWebSocketFrame");
	}

	@Override
	public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
		cause.printStackTrace();
		ctx.close();
	}
}
