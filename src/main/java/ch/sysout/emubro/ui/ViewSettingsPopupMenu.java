package ch.sysout.emubro.ui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.ButtonGroup;
import javax.swing.JMenu;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;

import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

class ViewSettingsPopupMenu extends JPopupMenu implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JRadioButtonMenuItem itm1 = new JRadioButtonMenuItem(Messages.get("viewCoversBiggest"));
	private JRadioButtonMenuItem itm2 = new JRadioButtonMenuItem(Messages.get("viewCoversBig"));
	private JRadioButtonMenuItem itm3 = new JRadioButtonMenuItem(Messages.get("viewCoversNormal"));
	private JRadioButtonMenuItem itm4 = new JRadioButtonMenuItem(Messages.get("viewCoversSmall"));
	private JRadioButtonMenuItem itm5 = new JRadioButtonMenuItem(Messages.get("viewCoversSmallest"));
	private JMenu mnuList = new JMenu(Messages.get("viewList"));
	private JRadioButtonMenuItem itmList = new JRadioButtonMenuItem(Messages.get("viewListHorizontalSb"));
	private JRadioButtonMenuItem itmListViewNoHorizontalScrollBar = new JRadioButtonMenuItem(
			Messages.get("viewListVerticalSb"));
	private JRadioButtonMenuItem itmListViewOneColumn = new JRadioButtonMenuItem(Messages.get("viewListOneColumn"));

	private JRadioButtonMenuItem itmDetails = new JRadioButtonMenuItem(Messages.get("viewDetails"));

	public ViewSettingsPopupMenu() {
		ButtonGroup grp = new ButtonGroup();
		grp.add(itm1);
		grp.add(itm2);
		grp.add(itm3);
		grp.add(itm4);
		grp.add(itm5);
		grp.add(itmList);
		grp.add(itmListViewNoHorizontalScrollBar);
		grp.add(itmListViewOneColumn);
		grp.add(itmDetails);

		mnuList.add(itmList);
		mnuList.add(itmListViewNoHorizontalScrollBar);
		mnuList.add(itmListViewOneColumn);

		add(itm1);
		add(itm2);
		add(itm3);
		add(itm4);
		add(itm5);
		add(mnuList);
		add(itmDetails);

		setAccelerators();
		setIcons();
	}

	private void setAccelerators() {
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itm1.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itm2.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itm3.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itm4.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itm5.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		mnuList.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmList.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmListViewNoHorizontalScrollBar.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmListViewOneColumn.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmDetails.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
	}

	public void addChangeToListViewListener(ActionListener l) {
		itmList.addActionListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		itmDetails.addActionListener(l);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		e.getSource();
	}
}