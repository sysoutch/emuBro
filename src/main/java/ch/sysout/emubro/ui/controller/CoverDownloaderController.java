package ch.sysout.emubro.ui.controller;

import java.awt.Component;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.List;

import javax.imageio.ImageIO;
import javax.swing.*;

import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.ui.CoverDownloaderWindow;
import ch.sysout.emubro.ui.SortedListModel;
import ch.sysout.emubro.ui.event.CoverDownloaderEvent;
import ch.sysout.emubro.ui.listener.CoverDownloaderListener;

public class CoverDownloaderController implements CoverDownloaderListener {
	private CoverDownloaderWindow coverDownloaderWindow;

	public CoverDownloaderController() {
		createUI();
	}

	private void createUI() {
		coverDownloaderWindow = new CoverDownloaderWindow("Cover Downlaoder");
		coverDownloaderWindow.addCoverDownloaderListener(this);
	}

	public void downloadImage(String gameCode) throws IOException {
		if (gameCode == null || gameCode.trim().isEmpty()) {
			return;
		}
		String urlString = "https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/" + gameCode + ".jpg";
		URL url = new URL(urlString);
		BufferedImage image = ImageIO.read(url);
		ImageIO.write(image, "jpg", new File("cover_" + gameCode + ".jpg"));
	}

	@Override
	public void coverDownloaded(CoverDownloaderEvent event) {

	}

	public void setRelativeTo(Component parent) {
		coverDownloaderWindow.setLocationRelativeTo(parent);
	}

	public void setWindowVisible(boolean b) {
		coverDownloaderWindow.setVisible(b);
	}

	public void setPlatformListModel(SortedListModel<Platform> platformListModel) {
		coverDownloaderWindow.setPlatformListModel(platformListModel);
	}
}
