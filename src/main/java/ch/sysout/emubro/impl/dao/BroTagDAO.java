package ch.sysout.emubro.impl.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import ch.sysout.emubro.api.dao.TagDAO;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.util.SqlUtil;
import ch.sysout.util.ValidationUtil;

public class BroTagDAO implements TagDAO {
	private Connection conn;

	public BroTagDAO(Connection conn) {
		this.conn = conn;
	}

	@Override
	public void addTag(Tag tag) throws SQLException {
		ValidationUtil.checkNull(tag, "tag");
		Statement stmt = conn.createStatement();
		String sql = SqlUtil.insertIntoWithColumnsString("tag",
				"tag_name", "tag_hexColor", SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(tag.getName())), SqlUtil.getQuotedString(SqlUtil.getQuotationsMarkedString(tag.getHexColor())));
		stmt.executeQuery(sql);
		conn.commit();
		stmt.close();
	}

	@Override
	public void removeTag(int tagId) throws SQLException {
		//		Statement stmt = conn.createStatement();
		//		String sql = "update tag platform_deleted="+true+" where platform_id=" + tagId;
		//		stmt.executeQuery(sql);
		//		conn.commit();
		//		stmt.close();
	}

	@Override
	public BroTag getTag(int tagId) throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();

		String sql = "select * from tag where tag_id = " + tagId;
		ResultSet rset = stmt.executeQuery(sql);
		BroTag tag = null;
		if (rset.next()) {
			int id = rset.getInt("tag_id");
			String name = rset.getString("tag_name");
			String hexColor = rset.getString("tag_hexColor");
			tag = new BroTag(id, name, hexColor);
		}
		stmt.close();
		return tag;
	}

	@Override
	public int getLastAddedTagId() throws SQLException {
		Statement stmt = conn.createStatement();
		stmt = conn.createStatement();
		String sql = "select TOP 1 tag_id from tag order by tag_id desc";
		ResultSet rset = stmt.executeQuery(sql);
		int tagId = -1;
		if (rset.next()) {
			tagId = rset.getInt("tag_id");
		}
		stmt.close();
		return tagId;
	}

	@Override
	public void updateTag(BroTag p) throws SQLException {
	}
}
