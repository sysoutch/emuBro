package ch.sysout.plugin.impl;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import javax.swing.JOptionPane;

import ch.sysout.plugin.api.PluginInterface;
import ch.sysout.plugin.api.PluginManager;

public class PluginManagerImpl implements PluginManager {

	private List<PluginInterface> loadedplugins = new ArrayList<>();

	public void start() {
		File[] files = new File("plugins").listFiles();
		for (File f : files) {
			loadPlugin(f);
		}
		for (PluginInterface pi : loadedplugins) {
			pi.start();
		}
	}

	public void stop() {
		for (PluginInterface pi : loadedplugins) {
			pi.stop();
		}
	}

	private void loadPlugin(File file) {
		System.out.println("[manager] this should load plugin");
	}

	public void addPlugin(PluginInterface plugin) {
		loadedplugins.add(plugin);
	}

	@Override
	public void openWindow(String msg) {
		JOptionPane.showMessageDialog(null, msg + "hallo thoie");
	}
}