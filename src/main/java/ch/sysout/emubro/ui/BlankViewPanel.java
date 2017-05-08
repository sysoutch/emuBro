package ch.sysout.emubro.ui;

import java.awt.dnd.DropTargetListener;

import ch.sysout.emubro.controller.ViewConstants;

public class BlankViewPanel extends ViewPanel {
	private static final long serialVersionUID = 1L;

	@Override
	public void addGameDragDropListener(DropTargetListener l) {
	}

	@Override
	public void groupByNone() {
	}

	@Override
	public void groupByPlatform() {
	}

	@Override
	public void languageChanged() {
	}

	@Override
	public int getGroupBy() {
		return ViewConstants.GROUP_BY_NONE;
	}
}
