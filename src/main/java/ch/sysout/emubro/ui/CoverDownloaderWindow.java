package ch.sysout.emubro.ui;

import java.awt.Dimension;
import java.util.ArrayList;
import java.util.List;

import javax.swing.DefaultListModel;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.WindowConstants;

import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.ui.listener.CoverDownloaderListener;
import ch.sysout.emubro.ui.util.FormLayoutUtils;

public class CoverDownloaderWindow extends JDialog {
	private static final long serialVersionUID = 1L;

	private JTextArea txtCoverUrl = new JTextArea();
	private JScrollPane spTxtCoverUrl = new JScrollPane(txtCoverUrl);

	private JList<Platform> lstPlatforms = new JList<>();
	private JScrollPane spPlatforms = new JScrollPane(lstPlatforms);

	private List<CoverDownloaderListener> listeners = new ArrayList<>();

	public CoverDownloaderWindow(String title) {
		setTitle(title);
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		setPreferredSize(new Dimension(300, 300));
		FormLayout layout = new FormLayout();
		FormLayoutUtils.appendGrowColumn(layout);
		setLayout(layout);
		int x = 1;
		int y = 1;
		FormLayoutUtils.addRow(layout);
		FormLayoutUtils.addGrowRow(layout);

		FormLayoutUtils.appendColumn(layout);
		add(new JLabel("blaa"), CC.xy(x, y));
		x += 2;
		FormLayoutUtils.appendGrowColumn(layout);
		add(spPlatforms, CC.xywh(x, y, 1, 2));

		y++;
		x = 1;
		add(spTxtCoverUrl, CC.xy(x, y));

		pack();
	}

	public void addCoverDownloaderListener(CoverDownloaderListener l) {
		if (!listeners.contains(l)) {
			listeners.add(l);
		}
	}

	public void setPlatformListModel(SortedListModel<Platform> platformListModel) {
		lstPlatforms.setModel(platformListModel);
	}
}
