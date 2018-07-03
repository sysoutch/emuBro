package ch.sysout.emubro.impl.model;

import ch.sysout.emubro.api.model.Tag;
import ch.sysout.util.ValidationUtil;

public class BroTag implements Tag {
	private int id = -1;
	private String name;
	private String hexColor;

	public BroTag() {
		this(-1, "", "");
	}

	public BroTag(int id, String name, String hexColor) {
		ValidationUtil.checkNull(name, "name");
		this.id = id;
		this.name = name;
		this.hexColor = (hexColor == null) ? "" : hexColor;
	}

	@Override
	public int getId() {
		return id;
	}

	@Override
	public void setId(int id) {
		this.id = id;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(String name) {
		this.name = name;
	}

	@Override
	public String getHexColor() {
		return hexColor;
	}

	@Override
	public void setHexColor(String hexColor) {
		this.hexColor = hexColor;
	}

	@Override
	public int compareTo(Tag t) {
		String thisTag = getName().toLowerCase();
		String otherTag = t.getName().toLowerCase();
		return thisTag.compareTo(otherTag);
	}

	@Override
	public String toString() {
		return name;
	}
}
