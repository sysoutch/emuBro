package ch.sysout.emubro.controller;

import java.awt.Image;
import java.awt.image.BufferedImage;
import java.util.concurrent.BlockingQueue;

public class Download implements Runnable {
	private BlockingQueue<Download> queue;
	private BufferedImage image;

	public Download(BlockingQueue<Download> queue) {
		this.queue = queue;
	}

	@Override
	public void run() {
	}

	public Image getCover() {
		return image;
	}
}
