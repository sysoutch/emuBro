package ch.sysout.emubro.impl.filter;

import java.util.List;

import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.model.Tag;

public class BroCriteria implements Criteria {

	private String text;
	private List<Tag> tags;

	public BroCriteria(String text, List<Tag> list) {
		this.text = text;
		tags = list;
	}

	@Override
	public String getText() {
		return text;
	}

	@Override
	public List<Tag> getTags() {
		return tags;
	}

	@Override
	public String toString() {
		return text;
	}

}