package ch.sysout.emubro.plugin.api;

public interface PluginInterface {
	public boolean start();

	public boolean stop();

	public void setPluginManager(PluginManager manager);
}