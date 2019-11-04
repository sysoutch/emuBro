package ch.sysout.emubro.api.model;

import java.awt.Color;

public interface Tag extends Comparable<Tag> {
	int getId();

	void setId(int platformId);

	String getName();

	void setName(String name);

	String getHexColor();

	void setHexColor(String hexColor);

	Color getColor();

	void setColor(Color color);
}