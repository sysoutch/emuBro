package ch.sysout.emubro.api.event;

public abstract class SearchCompleteEvent {
	private long duration;

	public SearchCompleteEvent(long duration) {
		setDuration(duration);
	}

	public long getDuration() {
		return duration;
	}

	public void setDuration(long duration) {
		this.duration = duration;
	}
}
