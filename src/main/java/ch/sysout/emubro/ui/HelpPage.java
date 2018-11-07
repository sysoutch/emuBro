package ch.sysout.emubro.ui;

public class HelpPage {
	private String page;
	private String htmlFile;

	public HelpPage(String page, String htmlFile) {
		this.page = page;
		this.htmlFile = htmlFile;
	}

	public String getName() {
		return page;
	}

	public String getHtmlFile() {
		return htmlFile;
	}
}
