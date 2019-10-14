package ch.sysout.emubro.ui;

import java.awt.BorderLayout;
import java.awt.GridLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.swing.AbstractButton;
import javax.swing.Icon;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.SwingConstants;

import ch.sysout.ui.util.JCustomButton;

public class AccordionPanel extends JPanel implements ActionListener {
	private static final long serialVersionUID = 1L;

	public static final int VERTICAL_ACCORDION = 0;

	private JPanel topPanel = new JPanel(new GridLayout(1, 1));
	private JPanel bottomPanel = new JPanel(new GridLayout(1, 1));

	private Map<String, AccordionTab> tabs = new LinkedHashMap<>();

	private int visibleBar = 0;

	private JComponent visibleComponent = null;

	public AccordionPanel(int verticalAccordion) {
		setLayout(new BorderLayout());
		topPanel.setOpaque(false);
		bottomPanel.setOpaque(false);
		this.add(topPanel, BorderLayout.NORTH);
		this.add(bottomPanel, BorderLayout.SOUTH);
	}

	public void addTab(String name, JComponent component) {
		addTab(name, null, component);
	}

	public void addTab(String name, Icon icon, JComponent component) {
		AccordionTab tab = new AccordionTab(name, icon, component);
		tab.getButton().addActionListener(this);
		tabs.put(name, tab);
		render();
	}

	public void removeBar(String name) {
		tabs.remove(name);
		render();
	}

	public int getVisibleBar() {
		return visibleBar;
	}

	public void setVisibleBar(int visibleBar) {
		if (visibleBar > 0 && visibleBar < tabs.size() - 1) {
			this.visibleBar = visibleBar;
			render();
		}
	}

	public void render() {
		// Compute how many bars we are going to have where
		int totalBars = tabs.size();
		int topBars = visibleBar + 1;
		int bottomBars = totalBars - topBars;

		// Get an iterator to walk through out bars with
		Iterator<String> it = tabs.keySet().iterator();

		// Render the top bars: remove all components, reset the GridLayout to
		// hold to correct number of bars, add the bars, and "validate" it to
		// cause it to re-layout its components
		topPanel.removeAll();
		GridLayout topLayout = (GridLayout) topPanel.getLayout();
		topLayout.setRows(topBars);
		AccordionTab barInfo = null;
		for (int i = 0; i < topBars; i++) {
			String barName = it.next();
			barInfo = tabs.get(barName);
			topPanel.add(barInfo.getButton());
		}
		topPanel.validate();

		// Render the center component: remove the current component (if there
		// is one) and then put the visible component in the center of this panel
		if (visibleComponent != null) {
			this.remove(visibleComponent);
		}
		visibleComponent = barInfo.getComponent();
		this.add(visibleComponent, BorderLayout.CENTER);

		// Render the bottom bars: remove all components, reset the GridLayout to
		// hold to correct number of bars, add the bars, and "validate" it to
		// cause it to re-layout its components
		bottomPanel.removeAll();
		GridLayout bottomLayout = (GridLayout) bottomPanel.getLayout();
		bottomLayout.setRows(bottomBars);
		for (int i = 0; i < bottomBars; i++) {
			String barName = it.next();
			barInfo = tabs.get(barName);
			bottomPanel.add(barInfo.getButton());
		}
		bottomPanel.validate();

		// Validate all of our components: cause this container to re-layout its
		// subcomponents
		validate();
	}

	/**
	 * Invoked when one of our bars is selected
	 */
	@Override
	public void actionPerformed(ActionEvent e) {
		int currentBar = 0;
		for (Iterator<String> it = tabs.keySet().iterator(); it.hasNext();) {
			String barName = it.next();
			AccordionTab barInfo = tabs.get(barName);
			if (barInfo.getButton() == e.getSource()) {
				// Found the selected button
				visibleBar = currentBar;
				render();
				return;
			}
			currentBar++;
		}
	}

	class AccordionTab {
		private String name;
		private AbstractButton button;
		private JComponent component;

		public AccordionTab(String name, JComponent component) {
			this(name, null, component);
		}

		public AccordionTab(String name, Icon icon, JComponent component) {
			this.name = name;
			this.component = component;
			button = new JCustomButton(name, icon);
			button.setHorizontalAlignment(SwingConstants.LEFT);
		}

		public String getName() {
			return name;
		}

		public void setName(String name) {
			this.name = name;
		}

		public AbstractButton getButton() {
			return button;
		}

		public JComponent getComponent() {
			return component;
		}
	}
}