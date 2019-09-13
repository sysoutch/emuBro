package ch.sysout.emubro.api.filter;

import java.util.List;

import ch.sysout.emubro.api.model.Tag;

public interface Criteria {
	String getText();
	List<Tag> getTags();
}
