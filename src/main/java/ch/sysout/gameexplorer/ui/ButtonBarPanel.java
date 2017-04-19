package ch.sysout.gameexplorer.ui;

import java.awt.Component;
import java.awt.Insets;
import java.awt.PopupMenu;
import java.awt.event.ComponentAdapter;
import java.awt.event.ComponentEvent;
import java.util.ArrayList;
import java.util.List;

import javax.swing.AbstractButton;
import javax.swing.JPanel;

import ch.sysout.util.Messages;

public class ButtonBarPanel extends JPanel {
	private static final long serialVersionUID = 1L;

	private List<ButtonBarButton> components = new ArrayList<>();

	private int lastPanelWidth = -1;

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

	public void addListeners() {
		addComponentListener(new ComponentAdapter() {
			// private int maximizeButton = 4;
			// private boolean abort = false;

			@Override
			public void componentResized(ComponentEvent e) {
				checkMinimizeMaximizeButtons();
			}
		});
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

	private void checkMinimizeButtons() {
		ButtonBarButton btn = null;
		//		for (int i = 0; i <= 6; i++) {
		//			if (!components.get(i).getText().isEmpty()) {
		//				if (i != 2) {
		//					btn = components.get(i);
		//					break;
		//				}
		//			}
		//		}
		if (!components.get(0).getText().isEmpty()) {
			components.get(0).setText("");
			if (!components.get(1).getText().isEmpty()) {
				components.get(1).setText("");
			}
		} else if (!components.get(6).getText().isEmpty()) {
			components.get(6).setText("");
		} else if (!components.get(5).getText().isEmpty()) {
			components.get(5).setText("");
		} else if (!components.get(4).getText().isEmpty()) {
			components.get(4).setText("");
		} else if (!components.get(2).getText().isEmpty()) {
			components.get(2).setText("");
		} else {
			if (components.get(6).isVisible()) {
				components.get(6).setVisible(false);
			} else if (components.get(5).isVisible()) {
				components.get(5).setVisible(false);
			} else if (components.get(4).isVisible()) {
				components.get(4).setVisible(false);
			} else if (components.get(2).isVisible()) {
				components.get(2).setVisible(false);
				components.get(3).setVisible(false);
			} else if (components.get(1).isVisible()) {
				components.get(1).setVisible(false);
			} else if (components.get(0).isVisible()) {
				components.get(0).setVisible(false);
			}
		}
	}

	private void checkMaximizeButtons() {
		int currentWidth = getWidth();
		int buttonBarContentWidth = getButtonBarContentWidth();
		int difference = currentWidth - buttonBarContentWidth;
		System.out.println("difference: "+difference);
		if (components.get(2).getText().isEmpty()) {
			if (difference > (components.get(2).getWidth() + components.get(3).getWidth())) {
				components.get(2).setText(Messages.get("runGame"));
			}
		} else if (components.get(4).getText().isEmpty()) {
			if (difference > components.get(2).getWidth()) {
				components.get(4).setText(Messages.get("remove"));
			}
		} else if (components.get(5).getText().isEmpty()) {
			if (difference > components.get(4).getWidth()) {
				components.get(5).setText(Messages.get("rename"));
			}
		} else if (components.get(6).getText().isEmpty()) {
			if (difference > components.get(5).getWidth()) {
				components.get(6).setText(Messages.get("gameProperties"));
			}
		} else if (components.get(0).getText().isEmpty()) {
			if (difference > (components.get(6).getWidth() + components.get(6).getWidth())) {
				components.get(1).setText(Messages.get("settings"));
				if (components.get(0).getText().isEmpty()) {
					components.get(0).setText(Messages.get("organize"));
				}
			}
		} else {
			if (!components.get(0).isVisible()) {
				components.get(0).setVisible(true);
			} else if (!components.get(1).isVisible()) {
				components.get(1).setVisible(true);
			} else if (!components.get(2).isVisible()) {
				components.get(2).setVisible(true);
				components.get(3).setVisible(true);
			} else if (!components.get(4).isVisible()) {
				components.get(4).setVisible(true);
			} else if (!components.get(5).isVisible()) {
				components.get(5).setVisible(true);
			} else if (!components.get(6).isVisible()) {
				components.get(6).setVisible(true);
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
}
