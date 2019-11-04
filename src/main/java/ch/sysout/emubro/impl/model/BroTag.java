package ch.sysout.emubro.impl.model;

import java.awt.Color;
import java.util.List;
import java.util.Map;

import ch.sysout.emubro.api.model.Tag;
import ch.sysout.util.ValidationUtil;

public class BroTag implements Tag {
	private int id = -1;
	private String name;
	private String hexColor;
	private Color color;

	public BroTag() {
		this(-1, "", "");
	}

	public BroTag(int id, Map<String, List<String>> obj, String hexColor) {
		this(id, obj.get("en").get(0), hexColor);
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
	public Color getColor() {
		return color;
	}

	@Override
	public void setColor(Color color) {
		this.color = color;
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