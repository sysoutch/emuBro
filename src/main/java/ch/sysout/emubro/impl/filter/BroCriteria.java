package ch.sysout.emubro.impl.filter;

import java.util.List;

import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.impl.model.BroTag;

public class BroCriteria implements Criteria {

	private String text;
	private List<BroTag> tags;

	public BroCriteria(String text, List<BroTag> list) {
		this.text = text;
		tags = list;
	}

	@Override
	public String getText() {
		return text;
	}

	@Override
	public List<BroTag> getTags() {
		return tags;
	}

	@Override
	public String toString() {
		return text;
	}

}