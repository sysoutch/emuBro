package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.awt.event.FocusAdapter;
import java.awt.event.FocusEvent;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.awt.font.TextAttribute;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.DefaultListCellRenderer;
import javax.swing.DefaultListModel;
import javax.swing.DefaultListSelectionModel;
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
import javax.swing.JScrollPane;
import javax.swing.JSeparator;
import javax.swing.JSplitPane;
import javax.swing.ListCellRenderer;
import javax.swing.MenuElement;
import javax.swing.MenuSelectionManager;
import javax.swing.SwingConstants;
import javax.swing.UIManager;
import javax.swing.border.Border;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;

import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.CellConstraints;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.api.FilterListener;
import ch.sysout.emubro.api.GameListener;
import ch.sysout.emubro.api.PlatformFromGameListener;
import ch.sysout.emubro.api.TagsFromGamesListener;
import ch.sysout.emubro.api.event.FilterEvent;
import ch.sysout.emubro.api.event.GameAddedEvent;
import ch.sysout.emubro.api.event.GameRemovedEvent;
import ch.sysout.emubro.api.event.TagEvent;
import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.filter.FilterGroup;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.api.model.Tag;
import ch.sysout.emubro.impl.event.BroFilterEvent;
import ch.sysout.emubro.impl.filter.BroCriteria;
import ch.sysout.emubro.impl.model.PlatformConstants;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.ui.util.FontUtil;
import ch.sysout.ui.util.ImageUtil;
import ch.sysout.ui.util.UIUtil;
import ch.sysout.util.Icons;
import ch.sysout.util.Messages;
import ch.sysout.util.ScreenSizeUtil;

public class GameFilterPanel extends JPanel implements GameListener, TagsFromGamesListener, PlatformFromGameListener {
	private static final long serialVersionUID = 1L;

	private JComboBox<Platform> cmbPlatforms;
	private JPanel pnlSearchField = new JPanel(new BorderLayout());
	private JExtendedTextField txtSearchGame = new JExtendedTextField();
	private ImageIcon icoSearch;
	private ImageIcon icoFilterGroupsSettings;
	private ImageIcon icoSaveFilterGroup;
	private ImageIcon icoFilterGroups;
	private ImageIcon iconRemove;
	private AbstractButton btnTags;
	private JButton btnFilterGroups;

	private int size = ScreenSizeUtil.is3k() ? 24 : 16;

	private List<FilterListener> filterListeners = new ArrayList<>();

	private boolean fireFilterEvent;

	private Explorer explorer;

	private Component requestFocusInWindowListener;

	private JPopupMenu mnuTags = new JPopupMenu();
	private JPopupMenu mnuFilterGroups = new JPopupMenu();

	private Map<String, Tag> tags = new HashMap<>();

	private JMenuItem itmNoTagsAvailable = new JMenuItem(Messages.get(MessageConstants.NO_TAGS_AVAILABLE));
	private JMenuItem itmNoFilterGroupsAvailable = new JMenuItem(Messages.get(MessageConstants.NO_FILTERGROUPS_AVAILABLE));

	protected boolean dontFireEvents;

	private JMenuItem itmSaveCurrentFilters;

	private JMenuItem itmClearTagFilter;

	protected Color colorSearchEmpty = Color.LIGHT_GRAY;

	private JButton btnResizeFilter = new JCustomButton();

	private JPanel pnlTags;
	//	private Icon icoTag = ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), size, Color.LIGHT_GRAY);

	private JList<String> lstTags;

	private AbstractButton btnResizeGameFilterPane = new JCustomButton();

	private JPanel pnlFilter;

	private JPopupMenu popupTags;

	private AbstractButton btnPinUnpinTagsPanel = new JCustomToggleButton("Pin");

	public GameFilterPanel(Explorer explorer) {
		super(new BorderLayout());
		this.explorer = explorer;
		initComponents();
		setIcons();
		createUI();
	}

	private void initComponents() {
		icoSearch = ImageUtil.getFlatSVGIconFrom(Icons.get("search"), 12, Color.LIGHT_GRAY);
		icoFilterGroupsSettings = ImageUtil.getImageIconFrom(Icons.get("filter", size, size));
		icoSaveFilterGroup = ImageUtil.getImageIconFrom(Icons.get("add", size, size));
		icoFilterGroups = ImageUtil.getFlatSVGIconFrom(Icons.get("setFilter"), size, size);
		iconRemove = ImageUtil.getImageIconFrom(Icons.get("remove", size, size));

		itmSaveCurrentFilters = new JMenuItem("Save current filters...", icoSaveFilterGroup);
		itmClearTagFilter = new JMenuItem("clear filter", iconRemove);
		itmClearTagFilter.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				unselectTags();
				fireEvent(new BroFilterEvent(getSelectedPlatformId(), getCriteria()));
			}
		});
		btnTags = new JCustomToggleButton("Tags", ImageUtil.getFlatSVGIconFrom(Icons.get("tag"), size, new Color(168, 124, 160)));
		btnTags.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				popupTags.setPreferredSize(new Dimension(pnlFilter.getWidth(), 220));
				//				popup.setPreferredSize(new Dimension(220, getParent().getHeight()));
				popupTags.show(pnlFilter, -1, pnlFilter.getHeight());
				//				popup.show(pnlFilter, pnlFilter.getWidth()-220, pnlFilter.getHeight());

				//				showAdvancedSearchSettingsPopupMenu(btnTags);
			}
		});
		btnFilterGroups = new JButton("", icoFilterGroupsSettings);
		btnFilterGroups.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				showFilterGroupsSettingsPopupMenu(btnFilterGroups);
			}
		});

		cmbPlatforms = new JComboBox<Platform>();
		cmbPlatforms.setEditable(false);
		cmbPlatforms.setMinimumSize(new Dimension(0, 0));
		cmbPlatforms.setRenderer(new CustomComboBoxRenderer());
		//		cmbPlatforms.setEditor(new CustomComboBoxEditor());
		//		cmbPlatforms.setUI(new BasicComboBoxUI() {
		//			@Override
		//			protected ComboPopup createPopup() {
		//				popup = new BasicComboPopup(comboBox) {
		//					private static final long serialVersionUID = 1L;
		//
		//					@Override
		//					protected JScrollPane createScroller() {
		//						JScrollPane sp = new JScrollPane(list,
		//								ScrollPaneConstants.VERTICAL_SCROLLBAR_AS_NEEDED,
		//								ScrollPaneConstants.HORIZONTAL_SCROLLBAR_NEVER);
		//						sp.setHorizontalScrollBar(null);
		//						return sp;
		//					}
		//				};
		//				return popup;
		//			}
		//
		//			@Override
		//			protected JButton createArrowButton() {
		//				return new JButton() {
		//					private static final long serialVersionUID = 1L;
		//
		//					@Override
		//					public int getWidth() {
		//						return 0;
		//					}
		//				};
		//			}
		//		});
		//		cmbPlatforms.remove(cmbPlatforms.getComponent(0));
		//		cmbPlatforms.setBorder(BorderFactory.createEmptyBorder());
		cmbPlatforms.addItem(new EmptyPlatform());
		cmbPlatforms.getEditor().getEditorComponent().addMouseListener(new MouseAdapter() {
			@Override
			public void mousePressed(MouseEvent e) {
				super.mousePressed(e);
				if (cmbPlatforms.isPopupVisible()) {
					cmbPlatforms.hidePopup();
				} else {
					cmbPlatforms.showPopup();
					cmbPlatforms.getEditor().selectAll();
				}
			}
		});
		cmbPlatforms.addFocusListener(new FocusAdapter() {
			@Override
			public void focusGained(FocusEvent e) {
				super.focusGained(e);
				cmbPlatforms.showPopup();
			}
		});
		cmbPlatforms.addActionListener(new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				if (!dontFireEvents) {
					Object selectedItem = cmbPlatforms.getSelectedItem();
					if (selectedItem instanceof Platform) {
						int platformId = ((Platform) selectedItem).getId();
						fireEvent(new BroFilterEvent(platformId, getCriteria()));
					}
				}
			}
		});

		btnResizeFilter.setFocusable(false);
		btnResizeFilter.addMouseListener(new MouseAdapter() {
			@Override
			public void mouseEntered(MouseEvent e) {
				super.mouseEntered(e);
				btnResizeFilter.setCursor(Cursor.getPredefinedCursor(Cursor.E_RESIZE_CURSOR | Cursor.W_RESIZE_CURSOR));
			}

			@Override
			public void mouseExited(MouseEvent e) {
				super.mouseExited(e);
				btnResizeFilter.setCursor(null);
			}
		});

		int size = ScreenSizeUtil.is3k() ? 16 : 12;
		btnResizeFilter.setIcon(ImageUtil.getImageIconFrom(Icons.get("barsWhiteVertical", size, size)));

		pnlTags = createTagPanel();
		btnResizeGameFilterPane.addMouseMotionListener(new MouseMotionAdapter() {

			@Override
			public void mouseDragged(MouseEvent e) {
				System.out.println("mouse dragged");
				popupTags.setPreferredSize(new Dimension(pnlFilter.getWidth(), popupTags.getHeight()+1));
			}
		});

		popupTags = new JPopupMenu() {
			private static final long serialVersionUID = 1L;

			@Override
			protected void paintComponent(Graphics g) {
				super.paintComponent(g);
				Graphics2D g2d = (Graphics2D) g.create();
				int w = getWidth();
				int h = getHeight();
				//g2d.setColor(IconStore.current().getCurrentTheme().getGameFilterPane().getColor());
				//g2d.fillRect(0, 0, w, h);
				BufferedImage background = IconStore.current().getCurrentTheme().getGameFilterPane().getImage();
				if (background != null) {
					g2d.drawImage(background, 0, 0, w, h, this);
				}
				g2d.dispose();
			}
		};
		popupTags.setLightWeightPopupEnabled(false);
		popupTags.setOpaque(false);
		popupTags.add(pnlTags);

		btnPinUnpinTagsPanel.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {

			}
		});
	}

	private void setIcons() {
		int size = ScreenSizeUtil.is3k() ? 16 : 12;
		btnResizeGameFilterPane.setIcon(ImageUtil.getImageIconFrom(Icons.get("barsWhite", size, size)));
	}

	private JPanel createTagPanel() {
		JPanel pnl = new JPanel(new BorderLayout());
		pnl.setOpaque(false);
		DefaultListModel<String> mdlLstTags = new DefaultListModel<>();
		lstTags = new JList<>(mdlLstTags);
		lstTags.setOpaque(false);
		lstTags.setCellRenderer(new DefaultListCellRenderer() {
			private static final long serialVersionUID = 1L;

			private Border border = BorderFactory.createEmptyBorder();

			@Override
			public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean isSelected,
					boolean cellHasFocus) {
				JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, isSelected,
						cellHasFocus);
				//				label.setOpaque(isSelected);
				//				label.setIcon(icoTag);
				label.setBorder(border);
				label.setHorizontalAlignment(SwingConstants.CENTER);
				label.setFont(FontUtil.getCustomFont());
				Color tagColor = tags.get(label.getText()).getColor();
				if (tagColor != null) {
					if (isSelected) {
						label.setBackground(tagColor);
						label.setForeground(UIUtil.getForegroundDependOnBackground(tagColor));
					} else {
						label.setForeground(tagColor);
						label.setBackground(IconStore.current().getCurrentTheme().getGameFilterPane().getColor());
					}
				}
				return label;
			}
		});
		//		lst.setFixedCellWidth(ScreenSizeUtil.adjustValueToResolution(255));
		lstTags.setFixedCellHeight(48);
		//		lst.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
		lstTags.setSelectionModel(new DefaultListSelectionModel() {
			private static final long serialVersionUID = 1L;

			@Override
			public void setSelectionInterval(int index0, int index1) {
				if(super.isSelectedIndex(index0)) {
					super.removeSelectionInterval(index0, index1);
				}
				else {
					super.addSelectionInterval(index0, index1);
				}
			}
		});
		lstTags.setLayoutOrientation(JList.VERTICAL_WRAP);
		lstTags.addListSelectionListener(new ListSelectionListener() {

			@Override
			public void valueChanged(ListSelectionEvent e) {
				int platformId = getSelectedPlatformId();
				fireEvent(new BroFilterEvent(platformId, getCriteria()));
			}
		});
		JScrollPane sp = new JScrollPane(lstTags,
				JScrollPane.VERTICAL_SCROLLBAR_NEVER, JScrollPane.HORIZONTAL_SCROLLBAR_ALWAYS);
		sp.getHorizontalScrollBar().setUnitIncrement(16);
		sp.getVerticalScrollBar().setUnitIncrement(16);
		sp.setOpaque(false);
		sp.getViewport().setOpaque(false);
		pnl.add(sp);
		pnl.addComponentListener(new ComponentAdapter() {
			@Override
			public void componentResized(ComponentEvent e) {
				super.componentResized(e);
				fixRowCountForVisibleColumns(lstTags);
			}
		});
		pnl.add(btnPinUnpinTagsPanel, BorderLayout.SOUTH);
		return pnl;
	}

	private void createUI() {
		setOpaque(false);

		Border textFieldBorder = txtSearchGame.getBorder();
		//		txtSearchGame.setPreferredSize(new Dimension(ScreenSizeUtil.adjustValueToResolution(256), 0));
		txtSearchGame.setMinimumSize(new Dimension(0, 0));
		//		txtSearchGame.putClientProperty("JTextField.showClearButton", true);
		txtSearchGame.putClientProperty("FlatLaf.style", "showClearButton: true");
		txtSearchGame.putClientProperty("JTextField.placeholderText", Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
		txtSearchGame.putClientProperty("JTextField.leadingIcon", icoSearch);

		//		txtSearchGame.setBorder(BorderFactory.createEmptyBorder());
		//		txtSearchGame.setOpaque(false);
		//		pnlSearchField.setOpaque(false);
		//pnlSearchFieldInner.setOpaque(true);
		//pnlSearchFieldInner.setBackground(IconStore.current().getCurrentTheme().getGameFilterPane().getColor().brighter());
		//		pnlSearchFieldInner.setBorder(textFieldBorder);

		// pnlSearchFieldInner.setBackground(getBackground());
		// ConstantSize spaceTopBottom = new ConstantSize(1, Unit.DIALOG_UNITS);
		// ConstantSize spaceLeftRight = new ConstantSize(2, Unit.DIALOG_UNITS);
		// pnlSearchFieldInner.setBorder(Paddings.createPadding(spaceTopBottom,
		// spaceLeftRight, spaceTopBottom, spaceLeftRight));
		//		btnTags.setBorderPainted(false);
		//		btnTags.setContentAreaFilled(false);
		btnTags.setToolTipText("Tags");

		btnFilterGroups.setBorderPainted(false);
		btnFilterGroups.setContentAreaFilled(false);
		btnFilterGroups.setToolTipText("Filter Groups");

		txtSearchGame.setForeground(colorSearchEmpty);

		FormLayout layout = new FormLayout("min:grow",
				"fill:pref");
		CellConstraints cc = new CellConstraints();
		pnlFilter = new JPanel(layout);
		pnlFilter.setOpaque(false);
		pnlFilter.setBorder(Paddings.DLU2);

		JPanel pnlWrapper = new JPanel(new BorderLayout());
		pnlWrapper.setOpaque(false);
		pnlWrapper.add(txtSearchGame);
		pnlWrapper.add(btnTags, BorderLayout.EAST);

		JSplitPane splFilterPlatformAndGame = new JSplitPane();
		splFilterPlatformAndGame.setResizeWeight(0.625);
		splFilterPlatformAndGame.setBorder(BorderFactory.createEmptyBorder());
		splFilterPlatformAndGame.setContinuousLayout(true);
		splFilterPlatformAndGame.setLeftComponent(cmbPlatforms);
		splFilterPlatformAndGame.setRightComponent(pnlWrapper);
		splFilterPlatformAndGame.setOpaque(false);
		pnlFilter.add(splFilterPlatformAndGame, cc.xy(1, 1));

		add(pnlFilter, BorderLayout.NORTH);
		//		add(pnlTags);
		//		add(btnResizeGameFilterPane, BorderLayout.SOUTH);

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
				if (!dontFireEvents) {
					int platformId = getSelectedPlatformId();
					fireEvent(new BroFilterEvent(platformId, getCriteria()));
				}
			}

			@Override
			public void insertUpdate(DocumentEvent e) {
				if (!dontFireEvents) {
					int platformId = getSelectedPlatformId();
					fireEvent(new BroFilterEvent(platformId, getCriteria()));
				}
			}

			@Override
			public void changedUpdate(DocumentEvent e) {
				if (!dontFireEvents) {
					int platformId = getSelectedPlatformId();
					fireEvent(new BroFilterEvent(platformId, getCriteria()));
				}
			}
		};
		txtSearchGame.getDocument().addDocumentListener(documentListener);
	}

	protected void showAdvancedSearchSettingsPopupMenu(JComponent comp) {
		setVisible(true);
		Component[] comps = mnuTags.getComponents();
		if (comps != null && comps.length != 0) {
			if (comps.length > 2) {
				mnuTags.remove(itmNoTagsAvailable);
			}
		} else {
			mnuTags.add(itmNoTagsAvailable);
		}
		int height = 0;
		if (comp != null) {
			height = comp.getHeight();
		}
		mnuTags.show(comp, 0, height);
	}

	protected void showFilterGroupsSettingsPopupMenu(JComponent comp) {
		setVisible(true);
		Component[] comps = mnuFilterGroups.getComponents();
		if (comps != null && comps.length != 0) {
			if (comps.length > 1) {
				mnuFilterGroups.remove(itmNoFilterGroupsAvailable);
			}
		} else {
			mnuFilterGroups.add(itmNoFilterGroupsAvailable);
		}
		int height = 0;
		if (comp != null) {
			height = comp.getHeight();
		}
		mnuFilterGroups.show(comp, 0, height);
	}

	protected void fireRequestFocusInWindowEvent() {
		requestFocusInWindowListener.requestFocusInWindow();
	}

	public int getSelectedPlatformId() {
		Object selectedItem = cmbPlatforms.getSelectedItem();
		if (selectedItem instanceof Platform) {
			return ((Platform) selectedItem).getId();
		}
		return PlatformConstants.NO_PLATFORM;
	}

	public Criteria getCriteria() {
		List<Tag> selectedTags = getSelectedTags();
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
			if (index != -1) {
				Platform platform = (Platform) value;
				if (platform != null) {
					String platformName = platform.getName();
					if (index > 0) {
						label.setText("<html><strong>"+platformName+"</strong></html>");
					} else {
						label.setText(platformName);
					}
				}
			}
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

	public void addSaveCurrentFiltersListener(ActionListener l) {
		itmSaveCurrentFilters.addActionListener(l);
	}

	public void setRequestFocusInWindowListener(Component l) {
		requestFocusInWindowListener = l;
	}

	public void languageChanged() {
		txtSearchGame.languageChanged();
		fireFilterEvent = false;
		txtSearchGame.putClientProperty("JTextField.placeholderText", Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
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
		mnuTags.add(itmClearTagFilter);
		mnuTags.add(new JSeparator());
		if (tags != null) {
			for (Tag tag : tags) {
				addNewTag(tag);
			}
		}
	}

	public void initFilterGroups(List<FilterGroup> filterGroups) {
		mnuFilterGroups.removeAll();
		//		mnuFilterGroups.add(new JMenuItem("New filter group...", icoSaveFilterGroup));
		mnuFilterGroups.add(itmSaveCurrentFilters);
		//		mnuFilterGroups.add(new JMenu("Update filter group"));
		mnuFilterGroups.add(new JSeparator());
		for (FilterGroup group : filterGroups) {
			addFilterGroupItem(group);
		}
	}

	private void addFilterGroupItem(final FilterGroup group) {
		JMenuItem itm = new JMenuItem(group.getName(), icoFilterGroups);
		itm.addActionListener(new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				FilterEvent filterEvent = group.getFilterEvent();
				Criteria criteria = filterEvent.getCriteria();
				int platformId = filterEvent.getPlatformId();
				dontFireEvents = true;
				if (criteria.getText().isEmpty()) {
					txtSearchGame.setText(Messages.get(MessageConstants.SEARCH_GAME) + " (Ctrl+F)");
					txtSearchGame.setForeground(Color.WHITE);
				} else {
					txtSearchGame.setText(criteria.getText());
					txtSearchGame.setForeground(UIManager.getColor("Label.foreground"));
				}
				if (platformId == PlatformConstants.NO_PLATFORM) {
					cmbPlatforms.setSelectedIndex(0);
				} else {
					cmbPlatforms.setSelectedItem(getPlatform(platformId));
				}
				selectTags(criteria.getTags());
				fireEvent(filterEvent);
				dontFireEvents = false;
				mnuTags.setVisible(false);
			}
		});
		mnuFilterGroups.add(itm);
	}

	public void showTags(List<Tag> tags) {
		outterLoop:
			for (int i = 2; i < mnuTags.getComponents().length; i++) {
				AbstractButton itm = (AbstractButton) mnuTags.getComponent(i);
				itm.setEnabled(false);
				itm.setForeground(UIManager.getColor("MenuItem.disabledForeground"));

				Font font = itm.getFont();
				Map<TextAttribute, Boolean> attributes = (Map<TextAttribute, Boolean>) font.getAttributes();
				attributes.put(TextAttribute.STRIKETHROUGH, TextAttribute.STRIKETHROUGH_ON);
				Font newFont = new Font(attributes);
				itm.setFont(newFont);

				int tmpId = this.tags.get(itm.getText()).getId();
				for (Tag t : tags) {
					if (tmpId == t.getId()) {
						itm.setEnabled(true);
						String hexColor = t.getHexColor();
						if (hexColor != null && !hexColor.trim().isEmpty()) {
							Color tagColor = Color.decode(hexColor);
							itm.setForeground(tagColor);
						}
						itm.setFont(getFont().deriveFont(Font.PLAIN));
						continue outterLoop;
					}
				}
			}
	}

	public void addNewTag(Tag tag) {
		JCheckBoxMenuItem itmTag = new JCheckBoxMenuItem(tag.getName());
		//		itmTag.setIcon(iconTag);
		if (tags.containsKey(tag.getName())) {
			return;
		}
		tags.put(tag.getName(), tag);

		((DefaultListModel<String>) lstTags.getModel()).addElement(tag.getName());

		mnuTags.add(itmTag);
		UIUtil.validateAndRepaint(mnuTags);
		itmTag.addActionListener(getTagItemListener(itmTag));
	}

	private ActionListener getTagItemListener(final AbstractButton itmTag) {
		return new ActionListener() {

			@Override
			public void actionPerformed(ActionEvent e) {
				addTagToFilter(itmTag.isSelected(), itmTag.getText());
			}
		};
	}

	public void addTagToFilter(boolean selected, Tag tag) {
		//		showAdvancedSearchSettingsPopupMenu(btnTags);
		for (int i = 2; i < mnuTags.getComponentCount(); i++) {
			JMenuItem itm = (JMenuItem) mnuTags.getComponent(i);
			if (itm.getText().equals(tag.getName())) {
				itm.setSelected(true);
				break;
			}
		}
		addTagToFilter(selected, tag.getName());
	}

	private void addTagToFilter(boolean selected, String tagName) {
		showAdvancedSearchSettingsPopupMenu(btnTags);

		mnuTags.setVisible(true);
		MenuSelectionManager.defaultManager().setSelectedPath(new MenuElement[] { mnuTags });
		if (selected) {
			btnTags.setText("<html><strong>Tags</strong></html>");
		} else {
			btnTags.setText("Tags");
			for (int i = 2; i < mnuTags.getComponents().length; i++) {
				AbstractButton itm = (AbstractButton) mnuTags.getComponent(i);
				if (itm.isSelected()) {
					btnTags.setText("<html><strong>Tags</strong></html>");
					break;
				}
			}
		}
		int platformId = getSelectedPlatformId();
		fireEvent(new BroFilterEvent(platformId, getCriteria()));
	}

	private void selectTags(List<Tag> list) {
		showAdvancedSearchSettingsPopupMenu(btnTags);
		mnuTags.setVisible(true);
		MenuSelectionManager.defaultManager().setSelectedPath(new MenuElement[] { mnuTags });
		for (int i = 2; i < mnuTags.getComponents().length; i++) {
			AbstractButton itm = (AbstractButton) mnuTags.getComponent(i);
			itm.setSelected(false);
			for (Tag t : list) {
				if (itm.getText().equals(t.getName())) {
					itm.setSelected(true);
					break;
				}
			}
		}
		btnTags.setText(list.size() > 0 ? "<html><strong>Tags</strong></html>" : "Tags");
	}

	private void unselectTags() {
		showAdvancedSearchSettingsPopupMenu(btnTags);
		mnuTags.setVisible(true);
		MenuSelectionManager.defaultManager().setSelectedPath(new MenuElement[] { mnuTags });
		for (int i = 2; i < mnuTags.getComponents().length; i++) {
			AbstractButton itm = (AbstractButton) mnuTags.getComponent(i);
			itm.setSelected(false);
		}
		btnTags.setText("Tags");
	}

	protected List<Tag> getSelectedTags() {
		List<Tag> selectedTags = new ArrayList<>();
		for (int i = 0; i < lstTags.getModel().getSize(); i++) {
			if (lstTags.isSelectedIndex(i)) {
				String tagName = lstTags.getModel().getElementAt(i);
				selectedTags.add(tags.get(tagName));
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

	public void filterGroupAdded(FilterGroup filterGroup) {
		addFilterGroupItem(filterGroup);
	}



	@Override
	public void platformFromGameAddedToFilter(Platform platform) {
		if (platform == null) {
			cmbPlatforms.setSelectedIndex(0);
			return;
		} else {
			int itemCount = cmbPlatforms.getItemCount();
			for (int i = 1; i < itemCount; i++) {
				Platform p = cmbPlatforms.getItemAt(i);
				if (p.getId() == platform.getId()) {
					cmbPlatforms.setSelectedIndex(i);
					break;
				}
			}
		}
	}

	public void tagAddedToGame(TagEvent e) {
		Tag tag = e.getTag();
		if (!tags.containsKey(tag.getName())) {
			addNewTag(tag);
		}
	}

	// TODO implement logic to remove tag when there are no more games which uses this tag
	public void tagRemovedFromGame(TagEvent e) {
		//		Tag tag = e.getTag();
		//		boolean removed = tags.remove(tag.getName()) != null;
		//		if (removed) {
		//			for (Component cmp : mnuTags.getComponents()) {
		//				if (cmp.getName().equals(tag.getName())) {
		//					mnuTags.remove(cmp);
		//					break;
		//				}
		//			}
		//		}
	}

	private void fixRowCountForVisibleColumns(JList<?> list) {
		int nCols = 0;
		int nRows = 0;
		nRows = computeVisibleRowCount(list);
		list.setVisibleRowCount(nRows);

		//			nCols = computeVisibleColumnCount(list);

		int nItems = list.getModel().getSize();

		// Compute the number of rows that will result in the desired number of
		// columns
		if (nCols != 0) {
			nRows = nItems / nCols;
			if (nItems % nCols > 0) {
				nRows++;
			}
			list.setVisibleRowCount(nRows);
		}
	}

	private int computeVisibleColumnCount(JList<?> list) {
		// It's assumed here that all cells have the same width. This method
		// could be modified if this assumption is false. If there was cell
		// padding, it would have to be accounted for here as well.
		Rectangle cellBounds = list.getCellBounds(0, 0);
		if (cellBounds != null) {
			int cellWidth = cellBounds.width;
			int width = list.getVisibleRect().width;
			return (cellWidth == 0) ? 0 : width / cellWidth;
		}
		return 1;
	}

	private int computeVisibleRowCount(JList<?> list) {
		// It's assumed here that all cells have the same width. This method
		// could be modified if this assumption is false. If there was cell
		// padding, it would have to be accounted for here as well.
		if (list != null) {
			Rectangle cellBounds = list.getCellBounds(0, 0);
			if (cellBounds != null) {
				int cellHeight = cellBounds.height;
				int height = list.getVisibleRect().height;
				if (height > 0 && cellHeight > 0) {
					int result = height / cellHeight;
					return result;
				}
			}
		}
		return 1;
	}

	@Override
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		Graphics2D g2d = (Graphics2D) g.create();
		int w = getWidth();
		int h = getHeight();
		//g2d.setColor(IconStore.current().getCurrentTheme().getGameFilterPane().getColor());
		//g2d.fillRect(0, 0, w, h);
		BufferedImage background = IconStore.current().getCurrentTheme().getGameFilterPane().getImage();
		if (background != null) {
			g2d.drawImage(background, 0, 0, w, h, this);
		}
		g2d.dispose();
	}

	public void checkMinimizeGameFilterPanel() {
		minimizeTagsButton(getWidth() < 360);
	}

	public void minimizeTagsButton(boolean unPinDetailsPane) {
		btnTags.setText(unPinDetailsPane ? "" : Messages.get(MessageConstants.TAGS));
	}
}