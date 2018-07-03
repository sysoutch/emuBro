package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.Insets;
import java.awt.PopupMenu;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;

import ch.sysout.emubro.api.event.GameSelectionEvent;
import ch.sysout.emubro.util.MessageConstants;
import ch.sysout.util.Messages;

public class ButtonBarPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private List<ButtonBarButton> components = new ArrayList<>();

	private int lastPanelWidth = -1;

	private boolean gameSelected = false;

	public ButtonBarPanel() {
		super();
		initComponents();
	}

	@Override
	public Component add(Component comp) {
		addComponent((ButtonBarButton) comp);
		return comp;
	}

	@Override
	public Component add(Component comp, int index) {
		addComponent((ButtonBarButton) comp);
		return super.add(comp, index);
	}

	@Override
	public void add(PopupMenu popup) {
		super.add(popup);
		// addComponent((ButtonBarButton) popup);
	}

	@Override
	public Component add(String name, Component comp) {
		addComponent((ButtonBarButton) comp);
		return super.add(name, comp);
	}

	@Override
	public void add(Component comp, Object constraints, int index) {
		super.add(comp, constraints, index);
		addComponent((ButtonBarButton) comp);
	}

	private void initComponents() {
		// btnOrganize.setBorderPainted(false);
		// btnRunGame.setVisible(false);
		// btnOrganize.setContentAreaFilled(false);
		// btnRunGame.setToolTipText("Spiel starten");
	}

	public void addComponent(ButtonBarButton c) {
		components.add(c);
	}

	@Override
	public void add(Component comp, Object constraints) {
		super.add(comp, constraints);
		addComponent((ButtonBarButton) comp);
	}

	public void removeComponent(ButtonBarButton c) {
		if (components.contains(c)) {
			components.remove(c);
		}
	}

	@Override
	public void remove(Component comp) {
		super.remove(comp);
		removeComponent((ButtonBarButton) comp);
	}

	public void checkMinimizeMaximizeButtons() {
		int currentPanelWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		boolean disableButton = currentPanelWidth <= buttonBarContentWidth;
		if (disableButton) {
			if (lastPanelWidth >= currentPanelWidth) {
				checkMinimizeButtons();
			}
		} else {
			boolean moreWidthThanBefore = currentPanelWidth > lastPanelWidth;
			if (moreWidthThanBefore) {
				checkMaximizeButtons();
				setVisible(true);
			}
		}
		lastPanelWidth = currentPanelWidth;
	}

	void checkMinimizeButtons() {
		int currentWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		int difference = currentWidth - buttonBarContentWidth;
		if (gameSelected) {
			if (hasText(0)) {
				if (difference == 0) {
					setEmptyTextForComponent(0);
					setEmptyTextForComponent(1);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMinimizeButtons();
						}
					});
				}
				return;
			} else if (hasText(6)) {
				if (difference == 0) {
					setEmptyTextForComponent(6);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMinimizeButtons();
						}
					});
				}
				return;
			} else if (hasText(5)) {
				if (difference == 0) {
					setEmptyTextForComponent(5);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMinimizeButtons();
						}
					});
				}
				return;
			} else if (hasText(4)) {
				if (difference == 0) {
					setEmptyTextForComponent(4);
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMinimizeButtons();
						}
					});
				}
				return;
			} else if (hasText(2)) {
				if (difference == 0) {
					setEmptyTextForComponent(2);
				}
				return;
			} else {
				//				System.out.println("difffff: " + difference);
				//				if (components.get(6).isVisible()) {
				//					components.get(6).setVisible(false);
				//				} else if (components.get(5).isVisible()) {
				//					components.get(5).setVisible(false);
				//				} else if (components.get(4).isVisible()) {
				//					components.get(4).setVisible(false);
				//				} else if (components.get(2).isVisible()) {
				//					components.get(2).setVisible(false);
				//					components.get(3).setVisible(false);
				//				} else if (components.get(1).isVisible()) {
				//					components.get(1).setVisible(false);
				//				} else if (components.get(0).isVisible()) {
				//					components.get(0).setVisible(false);
				//				}
			}
		} else {
			if (hasText(0)) {
				setEmptyTextForComponent(0);
				setEmptyTextForComponent(1);
			} else {
				//				components.get(1).setVisible(false);
				//				components.get(0).setVisible(false);
			}
		}
	}

	private void setEmptyTextForComponent(int i) {
		components.get(i).setText("");
	}

	private boolean hasText(int index) {
		return !components.get(index).getText().isEmpty();
	}

	void checkMaximizeButtons() {
		int currentWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		int difference = currentWidth - buttonBarContentWidth;
		if (gameSelected) {
			if (!hasText(2)) {
				if (difference > (components.get(2).getWidth() + components.get(3).getWidth())) {
					//					if (!components.get(3).isVisible() || !components.get(4).isVisible()
					//							|| !components.get(5).isVisible() || !components.get(6).isVisible()) {
					//						return;
					//					}
					components.get(2).setText(Messages.get(MessageConstants.RUN_GAME));
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMaximizeButtons();
						}
					});
				}
				return;
			} else if (!hasText(4)) {
				if (difference > (components.get(2).getWidth() + components.get(3).getWidth())) {
					components.get(4).setText(Messages.get(MessageConstants.REMOVE));
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMaximizeButtons();
						}
					});
				}
				return;
			} else if (!hasText(5)) {
				if (difference > components.get(4).getWidth()) {
					if (!components.get(6).isVisible()) {
						return;
					}
					components.get(5).setText(Messages.get(MessageConstants.RENAME));
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMaximizeButtons();
						}
					});
				}
				return;
			} else if (!hasText(6)) {
				if (difference > components.get(5).getWidth()) {
					components.get(6).setText(Messages.get(MessageConstants.GAME_PROPERTIES));
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMaximizeButtons();
						}
					});
				}
				return;
			} else if (!hasText(0)) {
				if (difference > (components.get(6).getWidth() + components.get(6).getWidth())) {
					components.get(1).setText(Messages.get(MessageConstants.SETTINGS));
					components.get(0).setText(Messages.get(MessageConstants.ORGANIZE));
					SwingUtilities.invokeLater(new Runnable() {

						@Override
						public void run() {
							checkMaximizeButtons();
						}
					});
				}
				return;
			}
			if (!components.get(0).isVisible()) {
				components.get(0).setVisible(true);
				components.get(0).setText("");
			}
			else if (!components.get(1).isVisible()) {
				components.get(1).setVisible(true);
				components.get(1).setText("");
			}
			else if (!components.get(2).isVisible()) {
				components.get(2).setVisible(true);
				components.get(3).setVisible(true);
				components.get(2).setText("");
				components.get(3).setText("");
			}
			else if (!components.get(4).isVisible()) {
				components.get(4).setVisible(true);
				components.get(4).setText("");
			}
			else if (!components.get(5).isVisible()) {
				components.get(5).setVisible(true);
				components.get(5).setText("");
			}
			else if (!components.get(6).isVisible()) {
				components.get(6).setVisible(true);
				components.get(6).setText("");
			}
		} else {
			if (components.get(0).getText().isEmpty()) {
				if (difference > (components.get(6).getWidth() + components.get(6).getWidth())) {
					if (!components.get(2).isVisible() || !components.get(3).isVisible() || !components.get(4).isVisible()
							|| !components.get(5).isVisible() || !components.get(6).isVisible()) {
						return;
					}
					components.get(1).setText(Messages.get(MessageConstants.SETTINGS));
					if (components.get(0).getText().isEmpty()) {
						components.get(0).setText(Messages.get(MessageConstants.ORGANIZE));
					}
				}
			} else {
				if (!components.get(0).isVisible()) {
					components.get(0).setVisible(true);
					components.get(0).setText("");
				} else if (!components.get(1).isVisible()) {
					components.get(1).setVisible(true);
					components.get(1).setText("");
				}
			}
		}
	}

	private int getButtonBarContentWidth() {
		int width = 0;
		for (AbstractButton c : components) {
			width += c.getWidth();
		}
		Insets insets = getBorder().getBorderInsets(this);
		return width + (insets.left + insets.right);
	}

	public void gameSelected(GameSelectionEvent e) {
		gameSelected = !e.getGames().isEmpty();
	}
}
