package ch.sysout.emubro.ui;

import java.util.ArrayList;
import java.util.List;

public class HelpTopic {
	private String topic;
	private String htmlFile;

	private List<HelpPage> helpPages = new ArrayList<>();

	public HelpTopic(String topic, String htmlFile) {
		this.topic = topic;
		this.htmlFile = htmlFile;
	}

	public void addHelpPage(HelpPage page) {
		helpPages.add(page);
	}

	public String getName() {
		return topic;
	}

	public String getHtmlFile() {
		return htmlFile;
	}

	public List<HelpPage> getHelpPages() {
		return helpPages;
	}
}
