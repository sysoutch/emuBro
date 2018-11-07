package ch.sysout.emubro.api.filter;

import java.util.List;

import ch.sysout.emubro.impl.model.BroTag;

public interface Criteria {
	String getText();
	List<BroTag> getTags();
}
