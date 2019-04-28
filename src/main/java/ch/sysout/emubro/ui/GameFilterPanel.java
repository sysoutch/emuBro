package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.FocusEvent;
import java.awt.event.FocusListener;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.font.TextAttribute;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.Icon;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JCheckBoxMenuItem;
import javax.swing.JComboBox;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JMenuItem;
import javax.swing.JPanel;
import javax.swing.JPopupMenu;
import javax.swing.JSplitPane;
import javax.swing.ListCellRenderer;
import javax.swing.MenuElement;
import javax.swing.MenuSelectionManager;
import javax.swing.UIManager;
import javax.swing.border.Border;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.TagsFromGamesListener;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.event.BroFilterEvent;
import ch.sysout.emubro.impl.filter.BroCriteria;
import ch.sysout.emubro.impl.model.BroTag;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Icons;
import ch.sysout.util.ImageUtil;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;
import ch.sysout.util.UIUtil;

public class GameFilterPanel extends JPanel implements GameListener, TagsFromGamesListener {
	private static final long serialVersionUID = 1L;

	private Icon iconFilter = ImageUtil.getImageIconFrom(Icons.get("setFilter", 16, 16));

	private JComboBox<Platform> cmbPlatforms;
	private JPanel pnlSearchField = new JPanel(new BorderLayout());
	private JPanel pnlSearchFieldInner = new JPanel(new BorderLayout());
	private JExtendedTextField txtSearchGame = new JExtendedTextField(Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
	private ImageIcon icoSearch;
	private ImageIcon icoClose;
	private ImageIcon icoAdvancedSearch;
	private JButton btnClose;
	private JButton btnTags;

	private int size = ScreenSizeUtil.is3k() ? 24 : 16;

	private List<FilterListener> filterListeners = new ArrayList<>();

	private boolean fireFilterEvent;

	private Explorer explorer;

	private Component requestFocusInWindowListener;

	private JPopupMenu mnuTags = new JPopupMenu();

	private Map<String, Tag> tags = new HashMap<>();

	private JMenuItem itmNoTagsAvailable = new JMenuItem(Messages.get(MessageConstants.NO_TAGS_AVAILABLE));

	public GameFilterPanel(Explorer explorer) {
		super(new BorderLayout());
		this.explorer = explorer;
		icoSearch = ImageUtil.getImageIconFrom(Icons.get("search", size, size));
		icoAdvancedSearch = ImageUtil.getImageIconFrom(Icons.get("tags", size, size));
		btnClose = new JButton(icoSearch);
		btnTags = new JButton("Tags", icoAdvancedSearch);
		btnTags.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				showAdvancedSearchSettingsPopupMenu(btnTags);
			}
		});
		icoClose = ImageUtil.getImageIconFrom(Icons.get("remove", size, size));
		// txtSearchGame.setFont(ScreenSizeUtil.defaultFont());

		Border textFieldBorder = txtSearchGame.getBorder();
		txtSearchGame.setPreferredSize(new Dimension(ScreenSizeUtil.adjustValueToResolution(256), 0));
		txtSearchGame.setBorder(BorderFactory.createEmptyBorder());
		pnlSearchFieldInner.setBorder(textFieldBorder);

		// pnlSearchFieldInner.setBackground(getBackground());
		// ConstantSize spaceTopBottom = new ConstantSize(1, Unit.DIALOG_UNITS);
		// ConstantSize spaceLeftRight = new ConstantSize(2, Unit.DIALOG_UNITS);
		// pnlSearchFieldInner.setBorder(Paddings.createPadding(spaceTopBottom,
		// spaceLeftRight, spaceTopBottom, spaceLeftRight));
		btnClose.setBorder(BorderFactory.createEmptyBorder());
		btnClose.setContentAreaFilled(false);
		btnClose.setFocusable(false);
		btnClose.setFocusPainted(false);
		btnClose.setOpaque(true);
		btnClose.setBackground(txtSearchGame.getBackground());
		btnClose.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				if (btnClose.getIcon() == icoClose) {
					txtSearchGame.setText("");
					fireRequestFocusInWindowEvent();
				}
			}
		});
		btnTags.setBorderPainted(false);
		btnTags.setContentAreaFilled(false);
		btnTags.setToolTipText("Erweiterte Suche");
		btnTags.addMouseListener(UIUtil.getMouseAdapter());
		pnlSearchField.setBorder(BorderFactory.createEmptyBorder());
		txtSearchGame.setForeground(Color.GRAY);

		pnlSearchFieldInner.add(txtSearchGame);
		pnlSearchFieldInner.add(btnClose, BorderLayout.EAST);
		// pnlSearchField.add(pnlSearchFieldInner);

		cmbPlatforms = new JComboBox<>();
		cmbPlatforms.addItem(new EmptyPlatform());
		cmbPlatforms.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				int platformId = ((Platform) cmbPlatforms.getSelectedItem()).getId();
				fireEvent(new BroFilterEvent(platformId, getCriteria()));
			}
		});

		FormLayout layout = new FormLayout("min:grow",
				"fill:pref");
		CellConstraints cc = new CellConstraints();
		JPanel pnl = new JPanel(layout);
		pnl.setBorder(Paddings.DLU2);

		JSplitPane splFilterPlatformAndGame = new JSplitPane();
		splFilterPlatformAndGame.setResizeWeight(0.625);
		splFilterPlatformAndGame.setBorder(BorderFactory.createEmptyBorder());
		splFilterPlatformAndGame.setContinuousLayout(true);
		splFilterPlatformAndGame.setLeftComponent(cmbPlatforms);

		JPanel pnlWrapper = new JPanel(new BorderLayout());
		pnlWrapper.add(pnlSearchFieldInner);
		pnlWrapper.add(btnTags, BorderLayout.EAST);
		splFilterPlatformAndGame.setRightComponent(pnlWrapper);

		pnl.add(splFilterPlatformAndGame, cc.xy(1, 1));
		add(pnl);

		txtSearchGame.addKeyListener(new KeyAdapter() {
			@Override
			public void keyPressed(KeyEvent e) {
				super.keyPressed(e);
				if (e.getKeyChar() == KeyEvent.VK_ESCAPE) {
					txtSearchGame.setText("");
					fireRequestFocusInWindowEvent();
				}
			}
		});

		final DocumentListener documentListener = new DocumentListener() {

			@Override
			public void removeUpdate(DocumentEvent e) {
				if (!isSearchFieldEmpty()) {
					if (!txtSearchGame.getText().isEmpty()) {
						btnClose.setIcon(icoClose);
					} else {
						btnClose.setIcon(icoSearch);
					}
				} else {
					btnClose.setIcon(icoSearch);
				}
				int platformId = getSelectedPlatformId();
				fireEvent(new BroFilterEvent(platformId, getCriteria()));
			}

			@Override
			public void insertUpdate(DocumentEvent e) {
				if (!isSearchFieldEmpty()) {
					txtSearchGame.setForeground(UIManager.getColor("Label.foreground"));
					if (!txtSearchGame.getText().isEmpty()) {
						btnClose.setIcon(icoClose);
					} else {
						btnClose.setIcon(icoSearch);
					}
				} else {
					btnClose.setIcon(icoSearch);
				}
				int platformId = getSelectedPlatformId();
				fireEvent(new BroFilterEvent(platformId, getCriteria()));
			}

			@Override
			public void changedUpdate(DocumentEvent e) {
				if (!isSearchFieldEmpty()) {
					txtSearchGame.setForeground(UIManager.getColor("Label.foreground"));
					if (!txtSearchGame.getText().isEmpty()) {
						btnClose.setIcon(icoClose);
					} else {
						btnClose.setIcon(icoSearch);
					}
				} else {
					btnClose.setIcon(icoSearch);
				}
				int platformId = getSelectedPlatformId();
				fireEvent(new BroFilterEvent(platformId, getCriteria()));
			}
		};
		txtSearchGame.getDocument().addDocumentListener(documentListener);
		txtSearchGame.addFocusListener(new FocusListener() {
			@Override
			public void focusLost(FocusEvent e) {
				if (txtSearchGame.getText().isEmpty()) {
					txtSearchGame.getDocument().removeDocumentListener(documentListener);
					txtSearchGame.setText(Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
					txtSearchGame.setForeground(Color.GRAY);
					txtSearchGame.getDocument().addDocumentListener(documentListener);
				}
			}

			@Override
			public void focusGained(FocusEvent e) {
				if (isSearchFieldEmpty()) {
					txtSearchGame.setForeground(UIManager.getColor("Label.foreground"));
					txtSearchGame.setText("");
				}
			}
		});
	}

	protected void showAdvancedSearchSettingsPopupMenu(JComponent comp) {
		Component[] comps = mnuTags.getComponents();
		if (comps != null && comps.length != 0) {
			if (comps.length > 1) {
				mnuTags.remove(itmNoTagsAvailable);
			}
		} else {
			mnuTags.add(itmNoTagsAvailable);
		}
		mnuTags.show(comp, 0, comp.getHeight());
	}

	protected void fireRequestFocusInWindowEvent() {
		requestFocusInWindowListener.requestFocusInWindow();
	}

	public int getSelectedPlatformId() {
		return ((Platform) cmbPlatforms.getSelectedItem()).getId();
	}

	public Criteria getCriteria() {
		List<BroTag> selectedTags = getSelectedTags();
		return new BroCriteria((isSearchFieldEmpty() ? "" : txtSearchGame.getText()), selectedTags);
	}

	public void initPlatforms(Collection<Platform> tmpPlatformsWithGames) {
		for (Platform p : tmpPlatformsWithGames) {
			cmbPlatforms.addItem(p);
		}
	}

	public boolean hasPlatform(int platformId) {
		for (int i = 0; i < cmbPlatforms.getItemCount(); i++) {
			if (cmbPlatforms.getItemAt(i).getId() == platformId) {
				return true;
			}
		}
		return false;
	}

	class MyComboRenderer implements ListCellRenderer<Object> {
		@Override
		public Component getListCellRendererComponent(JList<? extends Object> list, Object value, int index,
				boolean isSelected, boolean cellHasFocus) {
			JLabel label = new JLabel();
			Platform platform = cmbPlatforms.getItemAt(index);
			String platformName = (platform == null) ? Messages.get(MessageConstants.FILTER_PLATFORMS) : platform.getName();
			label.setText(platformName);
			return label;
		}
	}

	private void fireEvent(FilterEvent event) {
		if (fireFilterEvent) {
			for (FilterListener l : filterListeners) {
				l.filterSet(event);
			}
		}
	}

	boolean isSearchFieldEmpty() {
		return txtSearchGame.getText().equals(Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
	}

	public void addFilterListener(FilterListener l) {
		filterListeners.add(l);
	}

	public void setRequestFocusInWindowListener(Component l) {
		requestFocusInWindowListener = l;
	}

	public void languageChanged() {
		txtSearchGame.languageChanged();
		fireFilterEvent = false;
		txtSearchGame.setText(Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
		itmNoTagsAvailable.setText(Messages.get(MessageConstants.NO_TAGS_AVAILABLE));
		fireFilterEvent = true;
		cmbPlatforms.repaint();
	}

	@Override
	public void gameAdded(final GameAddedEvent e) {
		int platformId = e.getGame().getPlatformId();
		Platform platform = explorer.getPlatform(platformId);
		if (!hasPlatform(platform.getId())) {
			cmbPlatforms.addItem(platform);
		}
		for (Tag tag : e.getGame().getTags()) {
			if (!hasTag(tag.getName())) {
				addNewTag(tag);
			}
		}
	}

	@Override
	public void gameRemoved(GameRemovedEvent e) {
		int platformId = e.getGame().getPlatformId();
		if (explorer.getGameCountFromPlatform(platformId) == 0) {
			Platform platform;
			if ((platform = getPlatform(platformId)) != null) {
				cmbPlatforms.removeItem(platform);
			}
		}
	}

	private Platform getPlatform(int platformId) {
		for (int i = 0; i < cmbPlatforms.getItemCount(); i++) {
			Platform platform = cmbPlatforms.getItemAt(i);
			if (platform.getId() == platformId) {
				return platform;
			}
		}
		return null;
	}

	private boolean hasTag(String tagName) {
		return tags.containsKey(tagName);
	}

	public void setFocusInTextField() {
		txtSearchGame.selectAll();
		txtSearchGame.requestFocusInWindow();
	}

	public void initTags(List<Tag> tags) {
		this.tags.clear();
		mnuTags.removeAll();
		for (Tag tag : tags) {
			addNewTag(tag);
		}
	}

	public void showTags(List<Tag> tags) {
		outterLoop:
			for (Component itm : mnuTags.getComponents()) {
				itm.setEnabled(false);
				itm.setForeground(UIManager.getColor("MenuItem.disabledForeground"));

				Font font = itm.getFont();
				Map  attributes = font.getAttributes();
				attributes.put(TextAttribute.STRIKETHROUGH, TextAttribute.STRIKETHROUGH_ON);
				Font newFont = new Font(attributes);
				itm.setFont(newFont);

				int tmpId = this.tags.get(((AbstractButton) itm).getText()).getId();
				for (Tag t : tags) {
					if (tmpId == t.getId()) {
						itm.setEnabled(true);
						Color tagColor = Color.decode(t.getHexColor());
						itm.setForeground(tagColor);
						itm.setFont(getFont().deriveFont(Font.PLAIN));
						continue outterLoop;
					}
				}
			}
	}

	public void addNewTag(Tag tag) {
		if (tags.containsKey(tag.getName())) {
			return;
		}
		tags.put(tag.getName(), tag);
		JCheckBoxMenuItem itmTag = new JCheckBoxMenuItem(tag.getName());
		//		itmTag.setIcon(iconTag);

		Color tagColor = Color.decode(tag.getHexColor());
		itmTag.setForeground(tagColor);

		mnuTags.add(itmTag);
		UIUtil.validateAndRepaint(mnuTags);
		itmTag.addActionListener(getTagItemListener(itmTag));
	}

	private ActionListener getTagItemListener(AbstractButton itmTag) {
		return new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				addTagToFilter(itmTag.isSelected(), itmTag.getText());
			}
		};
	}

	public void addTagToFilter(boolean selected, Tag tag) {
		//		showAdvancedSearchSettingsPopupMenu(btnTags);
		for (int i = 0; i < mnuTags.getComponentCount(); i++) {
			JMenuItem itm = (JMenuItem) mnuTags.getComponent(i);
			if (itm.getText().equals(tag.getName())) {
				itm.setSelected(true);
				break;
			}
		}
		addTagToFilter(selected, tag.getName());
	}

	private void addTagToFilter(boolean selected, String tagName) {
		int platformId = getSelectedPlatformId();
		fireEvent(new BroFilterEvent(platformId, getCriteria()));

		mnuTags.setVisible(true);
		MenuSelectionManager.defaultManager().setSelectedPath(new MenuElement[] { mnuTags });
		if (selected) {
			btnTags.setText("<html><strong>Tags</strong></html>");
		} else {
			for (Component itm : mnuTags.getComponents()) {
				if (((AbstractButton) itm).isSelected()) {
					btnTags.setText("<html><strong>Tags</strong></html>");
					return;
				}
			}
			btnTags.setText("Tags");
		}
	}

	protected List<BroTag> getSelectedTags() {
		List<BroTag> selectedTags = new ArrayList<>();
		for (Component itm : mnuTags.getComponents()) {
			if (((AbstractButton) itm).isSelected()) {
				selectedTags.add((BroTag) tags.get(((AbstractButton) itm).getText()));
			}
		}
		return selectedTags;
	}

	@Override
	public void tagsInCurrentViewChanged(List<Tag> tags, boolean removeUnusedTags) {
		if (removeUnusedTags) {
			initTags(tags);
		} else {
			showTags(tags);
		}
	}
}