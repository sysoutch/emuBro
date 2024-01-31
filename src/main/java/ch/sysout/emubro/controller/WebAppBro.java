package ch.sysout.emubro.controller;

import java.awt.Graphics;
import java.awt.image.BufferedImage;
import java.io.OutputStream;
import java.util.Date;

import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletResponse;
import javax.swing.*;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.ui.IconStore;
import ch.sysout.emubro.util.EmuBroUtil;
import ch.sysout.ui.util.UIUtil;
import spark.Request;
import spark.Response;
import spark.Route;
import spark.Spark;

public class WebAppBro {
	private BroController controller;
	private Explorer explorer;

	private String getSomeData() {
		// This is a simple example. Replace this logic with your actual data retrieval/generation.
		return "Current Time: " + new Date().toString();
	}

	public void initWebApp(BroController controller, Explorer explorer) {
		this.controller = controller;
		Spark.staticFileLocation("/webapp");
		Spark.externalStaticFileLocation(EmuBroUtil.getResourceDirectory()+"/uploads");
		//		Spark.staticFiles.expireTime(600); // ten minutes
//		File storageDir = new File(controller.getStorageDirectory());
//		if (!storageDir.isDirectory()) {
//			return;
//		}


		Spark.get("/hello", (request, response) ->
	        "<!DOCTYPE html>" +
	         "<html>" +
	         "<head>" +
	           "<title>Hello Section Engineering!</title>" +
	           "<link rel='stylesheet' + href='https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css'>" +
	         "</head>" +
	        "<body>" +
	           "<h1>Hello Section Engineering!</h1>" +
	           "<p>Dear Friend,</p>" +
	           "<p>How are you? I'm vacationing in Nyeri while I learn programming! </p>" +
	           "<p>Friend, you would not believe how cold it is here. I should have gone to Kenya instead.</p>" +
	           "<p>But I like programming a lot, so I've got that going for me. </p>" +
	           "<p>Looking forward to seeing you soon. I'll bring you back a surprise. </p>" +
	           "<p>Cheers,</p>" +
	           "<p>Travel Enthusiast Moses</p>" +
	         "</body>" +
	       "</html>"
	    );

		Spark.get("/ping", new Route() {
				@Override
				public Object handle(Request request, Response response) throws Exception {
					return "pong";
				}
			}
		);

		Spark.post("/upload", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.uploadFile(req, res);
			}
		});

		Spark.post("/game/:gameId/run", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				System.out.println(req.host() + " ("+req.ip()+") wants to run game: " + req.params(":gameId"));
				int confirmDownload;
				boolean accessingFromLocalHost = req.ip().equals("127.0.0.1") || req.ip().equals("[0:0:0:0:0:0:0:1]");
				if (accessingFromLocalHost) {
					confirmDownload = JOptionPane.YES_OPTION;
				} else {
					confirmDownload = UIUtil.showQuestionMessage(null, req.host() + " (" + req.ip() + ") wants to run a game: " + req.params(":gameId") +
							"\nWant to allow?", "confirm");
				}
				if (confirmDownload == JOptionPane.YES_OPTION) {
					return controller.runCurrentGames(req.params(":gameId"));
				} else {
					res.status(-1);
					return res.status();
				}
			}
		});
		Spark.post("/game/:gameId/select", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				System.out.println(req.host() + " ("+req.ip()+") wants to select game..." + req.params(":gameId"));
				return controller.selectGame(req.params(":gameId"));
			}
		});
		Spark.get("/game/:gameId/download", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				System.out.println(req.host() + " ("+req.ip()+") wants to download file from game..." + req.params(":gameId"));
				// http://www.java2s.com/Code/Java/Network-Protocol/AnnslookupcloneinJava.htm
				int confirmDownload;
				boolean accessingFromLocalHost = req.ip().equals("127.0.0.1") || req.ip().equals("[0:0:0:0:0:0:0:1]");
				if (accessingFromLocalHost) {
					confirmDownload = JOptionPane.YES_OPTION;
				} else {
					confirmDownload = UIUtil.showQuestionMessage(null, req.host() + " (" + req.ip() + ") is downloading file..." + req.params(":gameId") +
							"\nWant to allow?", "confirm");
				}
				if (confirmDownload == JOptionPane.YES_OPTION) {
					return controller.downloadFile(req.params(":gameId"), res);
				} else {
					res.status(-1);
					return res.status();
				}
			}
		});
		Spark.get("/gameCover/:gameId", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				int gameId = Integer.valueOf(req.params(":gameId"));

				HttpServletResponse raw = res.raw();
				raw.setHeader("Content-Disposition", "attachment; filename=gamecover.png");

				ImageIcon icon = IconStore.current().getGameCover(gameId);
				if (icon == null) {
					icon = IconStore.current().getPlatformCover(explorer.getGame(gameId).getPlatformId());
				}
				BufferedImage bi = new BufferedImage(icon.getIconWidth(), icon.getIconHeight(),
						BufferedImage.TYPE_INT_ARGB);
				Graphics g = bi.createGraphics();
				icon.paintIcon(null, g, 0, 0);
				g.dispose();
				try (OutputStream out = res.raw().getOutputStream()) {
					ImageIO.write(bi, "png", out);
					bi.flush();
					out.close();
					return raw;
				}
			}
		});
		Spark.get("/platformIcon/:platformId", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				int platformId = Integer.valueOf(req.params(":platformId"));

				HttpServletResponse raw = res.raw();
				raw.setHeader("Content-Disposition", "attachment; filename="+explorer.getPlatform(platformId).getName()+".png");

				ImageIcon icon = IconStore.current().getPlatformIcon(platformId);
				BufferedImage bi = new BufferedImage(icon.getIconWidth(), icon.getIconHeight(),
						BufferedImage.TYPE_INT_ARGB);
				Graphics g = bi.createGraphics();
				icon.paintIcon(null, g, 0, 0);
				g.dispose();
				try (OutputStream out = res.raw().getOutputStream()) {
					ImageIO.write(bi, "png", out);
					bi.flush();
					out.close();
					return raw;
				}
			}
		});
		Spark.get("/games", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.listGames();
			}
		});
		Spark.get("/current_games", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.listGames(true);
			}
		});
		Spark.get("/platforms", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.listPlatforms();
			}
		});
		Spark.get("/platforms/:id", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.listPlatform(req.params(":id"));
			}
		});
		Spark.get("/currentGames", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.listGames(true);
			}
		});

		Spark.delete("/delete/:file", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.deleteFile(req.params(":file"));
			}
		});
	}
}
