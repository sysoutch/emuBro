package ch.sysout.emubro.api;

import java.util.List;

import ch.sysout.emubro.api.model.Tag;

public interface TagsFromGamesListener {
	void tagsInCurrentViewChanged(List<Tag> tags, boolean removeUnusedTags);
}
