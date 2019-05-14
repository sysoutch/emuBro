package ch.sysout.emubro.ui;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

import javax.swing.ButtonGroup;
import javax.swing.JMenu;
import javax.swing.JPopupMenu;
import javax.swing.JRadioButtonMenuItem;
import javax.swing.JSeparator;
import javax.swing.JSlider;
import javax.swing.event.ChangeListener;

import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

class ViewPopupMenu extends JPopupMenu implements ActionListener {
	private static final long serialVersionUID = 1L;

	private JRadioButtonMenuItem itmCoversBiggest = new JRadioButtonMenuItem(Messages.get("viewCoversBiggest"));
	private JRadioButtonMenuItem itmCoversBig = new JRadioButtonMenuItem(Messages.get("viewCoversBig"));
	private JRadioButtonMenuItem itmCoversNormal = new JRadioButtonMenuItem(Messages.get("viewCoversNormal"));
	private JRadioButtonMenuItem itmCoversSmall = new JRadioButtonMenuItem(Messages.get("viewCoversSmall"));
	private JRadioButtonMenuItem itmCoversSmallest = new JRadioButtonMenuItem(Messages.get("viewCoversSmallest"));
	private JRadioButtonMenuItem itmWelcome = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_WELCOME));
	private JRadioButtonMenuItem itmList = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_LIST));
	private JRadioButtonMenuItem itmElements = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_ELEMENTS));
	private JRadioButtonMenuItem itmDetails = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_TABLE));
	private JRadioButtonMenuItem itmContent = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_CONTENT));
	private JRadioButtonMenuItem itmSlider = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_SLIDER));
	private JRadioButtonMenuItem itmCovers = new JRadioButtonMenuItem(Messages.get(MessageConstants.VIEW_COVERS));

	private JMenu mnuSetCoverSize = new JMenu(Messages.get(MessageConstants.SET_COVER_SIZE));
	private JSlider sliderCoverSize = new JSlider(JSlider.HORIZONTAL);

	public ViewPopupMenu() {
		ButtonGroup grp = new ButtonGroup();
		grp.add(itmCoversBiggest);
		grp.add(itmCoversBig);
		grp.add(itmCoversNormal);
		grp.add(itmCoversSmall);
		grp.add(itmCoversSmallest);
		grp.add(itmWelcome);
		grp.add(itmList);
		grp.add(itmElements);
		grp.add(itmDetails);
		grp.add(itmContent);
		grp.add(itmSlider);
		grp.add(itmCovers);

		add(itmWelcome);
		add(new JSeparator());
		add(itmList);
		add(itmElements);
		add(itmDetails);
		add(itmContent);
		add(itmSlider);
		add(itmCovers);
		add(new JSeparator());

		sliderCoverSize.setMinimum(CoverConstants.TINY_COVERS);
		sliderCoverSize.setMaximum(CoverConstants.HUGE_COVERS);
		sliderCoverSize.setMinorTickSpacing(CoverConstants.TINY_COVERS);
		sliderCoverSize.setMajorTickSpacing(CoverConstants.TINY_COVERS);
		sliderCoverSize.setPaintLabels(false);
		sliderCoverSize.setPaintTicks(true);
		sliderCoverSize.setSnapToTicks(true);
		mnuSetCoverSize.add(sliderCoverSize);
		add(mnuSetCoverSize);

		setAccelerators();
		setIcons();
	}

	private void setAccelerators() {
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 24 : 16;
		itmWelcome.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewWelcome", size, size)));
		itmList.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmElements.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmDetails.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewTable", size, size)));
		itmContent.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewList", size, size)));
		itmCovers.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmCoversBiggest.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmCoversBig.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmCoversNormal.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmCoversSmall.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
		itmCoversSmallest.setIcon(ImageUtil.getImageIconFrom(Icons.get("viewCovers", size, size)));
	}

	public void addChangeToWelcomeViewListener(ActionListener l) {
		itmWelcome.addActionListener(l);
	}

	public void addCoverSizeListener(ChangeListener l) {
		sliderCoverSize.addChangeListener(l);
	}

	public void addChangeToCoversBiggestListener(ActionListener l) {
		itmCoversBiggest.addActionListener(l);
	}

	public void addChangeToCoversBigListener(ActionListener l) {
		itmCoversBig.addActionListener(l);
	}

	public void addChangeToCoversNormalListener(ActionListener l) {
		itmCoversNormal.addActionListener(l);
	}

	public void addChangeToCoversSmallListener(ActionListener l) {
		itmCoversSmall.addActionListener(l);
	}

	public void addChangeToCoversSmallestListener(ActionListener l) {
		itmCoversSmallest.addActionListener(l);
	}

	public void addChangeToListViewListener(ActionListener l) {
		itmList.addActionListener(l);
	}

	public void addChangeToElementViewListener(ActionListener l) {
		itmElements.addActionListener(l);
	}

	public void addChangeToTableViewListener(ActionListener l) {
		itmDetails.addActionListener(l);
	}

	public void addChangeToContentViewListener(ActionListener l) {
		itmContent.addActionListener(l);
	}

	public void addChangeToSliderViewListener(ActionListener l) {
		itmSlider.addActionListener(l);
	}

	public void addChangeToCoverViewListener(ActionListener l) {
		itmCovers.addActionListener(l);
	}

	@Override
	public void actionPerformed(ActionEvent e) {
		e.getSource();
	}

	public void languageChanged() {
		itmWelcome.setText(Messages.get(MessageConstants.VIEW_WELCOME));
		itmList.setText(Messages.get(MessageConstants.VIEW_LIST));
		itmElements.setText(Messages.get(MessageConstants.VIEW_ELEMENTS));
		itmDetails.setText(Messages.get(MessageConstants.VIEW_TABLE));
		itmContent.setText(Messages.get(MessageConstants.VIEW_CONTENT));
		itmSlider.setText(Messages.get(MessageConstants.VIEW_SLIDER));
		itmCovers.setText(Messages.get(MessageConstants.VIEW_COVERS));
		mnuSetCoverSize.setText(Messages.get(MessageConstants.SET_COVER_SIZE));
	}
}