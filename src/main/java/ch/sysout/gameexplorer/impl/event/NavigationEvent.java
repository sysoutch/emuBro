package ch.sysout.gameexplorer.impl.event;

public class NavigationEvent {
	private int view;

	public NavigationEvent(int view) {
		this.view = view;
	}

	public int getView() {
		return view;
	}
}
