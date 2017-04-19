package ch.sysout.gameexplorer.impl.filter;

import ch.sysout.gameexplorer.api.filter.Criteria;

public class BroCriteria implements Criteria {

	private String text;

	public BroCriteria(String text) {
		this.text = text;
	}

	@Override
	public String getText() {
		return text;
	}

	@Override
	public String toString() {
		return text;
	}

}
