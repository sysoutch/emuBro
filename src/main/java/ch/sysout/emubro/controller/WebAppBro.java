package ch.sysout.emubro.controller;

import java.awt.Graphics;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.OutputStream;

import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletResponse;
import javax.swing.ImageIcon;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.ui.IconStore;
import spark.Request;
import spark.Response;
import spark.Route;
import spark.Spark;

public class WebAppBro {
	private BroController controller;
	private Explorer explorer;

	public void initWebApp(BroController controller, Explorer explorer) {
		this.controller = controller;
		Spark.staticFileLocation("/webapp");
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
		Spark.post("/upload", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.uploadFile(req);
			}
		});
		Spark.post("/game/:id/run", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.runGame(req.params(":id"));
			}
		});
		Spark.post("/game/:id/select", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.selectGame(req.params(":id"));
			}
		});
		Spark.get("/download/:file", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				return controller.downloadFile(req.params(":file"));
			}
		});
		Spark.get("/gameCover/:gameId", new Route() {
			@Override
			public Object handle(Request req, Response res) throws Exception {
				int gameId = Integer.valueOf(req.params(":gameId"));

				HttpServletResponse raw = res.raw();
				raw.setHeader("Content-Disposition", "attachment; filename=gamecover.png");

				ImageIcon icon = IconStore.current().getGameCover(gameId);
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
