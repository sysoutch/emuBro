package ch.sysout.emubro.ui;

import java.awt.Component;
import java.awt.Container;
import java.awt.Insets;
import java.awt.event.ActionListener;
import java.awt.event.HierarchyEvent;
import java.awt.event.HierarchyListener;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;

import javax.swing.Icon;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JOptionPane;
import javax.swing.JRootPane;
import javax.swing.SwingUtilities;
import javax.swing.WindowConstants;
import javax.swing.plaf.basic.BasicOptionPaneUI;

import ch.sysout.ui.util.JCustomButton;
import sun.swing.DefaultLookup;

public class OptionPaneFactory {

	/**
	 * prevent instantiation
	 */
	private OptionPaneFactory() {
	}

	public static JOptionPane createErrorMessage(Component parentComponent, String cause, String reason,
			String solution) {
		JDialog dlg = createDialog(parentComponent);
		JOptionPane op = new JOptionPane(cause + "\n\n" + reason + "\n\n" + solution, JOptionPane.ERROR_MESSAGE,
				JOptionPane.OK_OPTION);
		op.setUI(new BasicOptionPaneUI() {
			@Override
			protected void addButtonComponents(Container container, Object[] buttons, int initialIndex) {
				if (buttons != null && buttons.length > 0) {
					boolean sizeButtonsToSame = getSizeButtonsToSameWidth();
					boolean createdAll = true;
					int numButtons = buttons.length;
					JButton[] createdButtons = null;
					int maxWidth = 0;

					if (sizeButtonsToSame) {
						createdButtons = new JCustomButton[numButtons];
					}

					for (int counter = 0; counter < numButtons; counter++) {
						Object button = buttons[counter];
						Component newComponent;

						if (button instanceof Component) {
							createdAll = false;
							newComponent = (Component) button;
							container.add(newComponent);
							hasCustomComponents = true;

						} else {
							JButton aButton;

							// if (button instanceof ButtonFactory) {
							// aButton = ((ButtonFactory)button).createButton();
							// } else
							if (button instanceof Icon) {
								aButton = new JCustomButton((Icon) button);
							} else {
								aButton = new JCustomButton(button.toString());
							}

							aButton.setName("OptionPane.button");
							aButton.setMultiClickThreshhold(
									DefaultLookup.getInt(optionPane, this, "OptionPane.buttonClickThreshhold", 0));

							aButton.setText("bla");
							container.add(aButton);

							ActionListener buttonListener = createButtonActionListener(counter);
							if (buttonListener != null) {
								aButton.addActionListener(buttonListener);
							}
							newComponent = aButton;
						}
						if (sizeButtonsToSame && createdAll && (newComponent instanceof JButton)) {
							createdButtons[counter] = (JButton) newComponent;
							maxWidth = Math.max(maxWidth, newComponent.getMinimumSize().width);
						}
						if (counter == initialIndex) {
							initialFocusComponent = newComponent;
							if (initialFocusComponent instanceof JButton) {
								JButton defaultB = (JButton) initialFocusComponent;
								defaultB.addHierarchyListener(new HierarchyListener() {
									@Override
									public void hierarchyChanged(HierarchyEvent e) {
										if ((e.getChangeFlags() & HierarchyEvent.PARENT_CHANGED) != 0) {
											JButton defaultButton = (JButton) e.getComponent();
											JRootPane root = SwingUtilities.getRootPane(defaultButton);
											if (root != null) {
												root.setDefaultButton(defaultButton);
											}
										}
									}
								});
							}
						}
					}
					((ButtonAreaLayout) container.getLayout()).setSyncAllWidths((sizeButtonsToSame && createdAll));
					/*
					 * Set the padding, windows seems to use 8 if <= 2 components, otherwise 4 is
					 * used. It may actually just be the size of the buttons is always the same, not
					 * sure.
					 */
					if (DefaultLookup.getBoolean(optionPane, this, "OptionPane.setButtonMargin", true)
							&& sizeButtonsToSame && createdAll) {
						JButton aButton;
						int padSize;

						padSize = (numButtons <= 2 ? 8 : 4);

						for (int counter = 0; counter < numButtons; counter++) {
							aButton = createdButtons[counter];
							aButton.setMargin(new Insets(2, padSize, 2, padSize));
						}
					}
				}
			}
		});
		op.addPropertyChangeListener(new PropertyChangeListener() {
			@Override
			public void propertyChange(PropertyChangeEvent evt) {
				String name = evt.getPropertyName();
				if (name.equals("value")) {
					dlg.dispose();
				}
			}
		});
		dlg.add(op);
		dlg.pack();
		dlg.setVisible(true);
		return op;
	}

	private static JDialog createDialog(Component parentComponent) {
		JDialog dlg = new JDialog();
		dlg.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
		dlg.setLocationRelativeTo(parentComponent);
		dlg.setUndecorated(true);
		dlg.setVisible(true);
		return dlg;
	}
}
