package ch.sysout.emubro.api.dao;

import java.sql.SQLException;

import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.model.BroTag;

public interface TagDAO {
	void addTag(Tag tag) throws SQLException;

	void removeTag(int tagId) throws SQLException;

	BroTag getTag(int tagId) throws SQLException;

	int getLastAddedTagId() throws SQLException;

	void updateTag(BroTag tag) throws SQLException;
}
