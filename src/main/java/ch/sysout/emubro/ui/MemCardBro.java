package ch.sysout.emubro.ui;

import java.awt.Container;
import java.awt.event.ActionListener;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.lang.reflect.Type;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.DefaultListModel;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.WindowConstants;

import org.apache.commons.io.FileUtils;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.jgoodies.forms.factories.CC;
import com.jgoodies.forms.factories.Paddings;
import com.jgoodies.forms.layout.FormLayout;

import ch.sysout.emubro.controller.MCRObject.SaveBlock;
import ch.sysout.emubro.controller.MCRReader;

public class MemCardBro extends JFrame {
	private static final long serialVersionUID = 1L;

	private JList<SaveBlock> lstSaveBlocksMemCard1, lstSaveBlocksMemCard2;
	private DefaultListModel<SaveBlock> mdlLstSaveBlocks1 = new DefaultListModel<SaveBlock>();
	private DefaultListModel<SaveBlock> mdlLstSaveBlocks2 = new DefaultListModel<SaveBlock>();
	private JScrollPane spMemCard1, spMemCard2;
	private JLabel label1, label2;
	private JButton btnCopySlot, btnDeleteSlot, btnExportSlot, btnImportSlot;
	private JButton openFileButton1, openFileButton2;

	private JComboBox<String> cmbChooseMemCard1 = new JComboBox<String>();
	private JComboBox<String> cmbChooseMemCard2 = new JComboBox<String>();

	private JButton btnNewMemCard1;
	private JButton btnOpenMemCard1;
	private JButton btnNewMemCard2;
	private JButton btnOpenMemCard2;

	private JButton btnFormatCard1;
	private JButton btnFormatCard2;
	private JButton btnImportFileForCard1;
	private JButton btnImportFileForCard2;
	private JButton btnImportCard1;
	private JButton btnImportCard2;
	private JButton btnSaveCard1;
	private JButton btnSaveCard2;

	private Map<String, String> gameCodes = new HashMap<>();


	public MemCardBro() {
		initializeGameCodes();

		initComponents();
		setTitle("Memory Card Manager");
		setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);

		JPanel pnl = new JPanel();
		pnl.setLayout(new FormLayout("m, $rgap, m, $rgap, m, $rgap, m, m, m:g, $rgap, m, $rgap, m, $rgap, m, $rgap, m, $rgap, m, m:g",
				"m, $rgap, m, $lgap, m, $lgap, m, $lgap, m, m:g, $rgap, m"));
		pnl.setBorder(Paddings.DIALOG);
		JPanel pnlTopWrapper1 = new JPanel(new FormLayout("m, $lcgap, m:g, $rgap, m, $rgap, m",
				"m"));
		// Add components to the panel using the FormLayout
		pnlTopWrapper1.add(label1, CC.xy(1, 1));
		pnlTopWrapper1.add(cmbChooseMemCard1, CC.xy(3, 1));
		pnlTopWrapper1.add(btnNewMemCard1, CC.xy(5, 1));
		pnlTopWrapper1.add(btnOpenMemCard1, CC.xy(7, 1));
		pnl.add(pnlTopWrapper1, CC.xywh(1, 1, 9, 1));

		pnl.add(spMemCard1, CC.xywh(1, 3, 9, 8));

		JPanel pnlTopWrapper2 = new JPanel(new FormLayout("m, $lcgap, m:g, $rgap, m, $rgap, m",
				"m"));
		pnlTopWrapper2.add(label2, CC.xy(1, 1));
		pnlTopWrapper2.add(cmbChooseMemCard2, CC.xy(3, 1));
		pnlTopWrapper2.add(btnNewMemCard2, CC.xy(5, 1));
		pnlTopWrapper2.add(btnOpenMemCard2, CC.xy(7, 1));
		pnl.add(pnlTopWrapper2, CC.xywh(13, 1, 8, 1));

		pnl.add(spMemCard2, CC.xywh(13, 3, 8, 8));

		pnl.add(btnCopySlot, CC.xy(11, 3));
		pnl.add(btnDeleteSlot, CC.xy(11, 5));
		pnl.add(btnImportSlot, CC.xy(11, 7));
		pnl.add(btnExportSlot, CC.xy(11, 9));

		pnl.add(btnFormatCard1, CC.xy(1, 12));
		pnl.add(btnImportFileForCard1, CC.xy(3, 12));
		pnl.add(btnImportCard1, CC.xy(5, 12));
		pnl.add(btnSaveCard1, CC.xy(7, 12));

		pnl.add(btnFormatCard2, CC.xy(13, 12));
		pnl.add(btnImportFileForCard2, CC.xy(15, 12));
		pnl.add(btnImportCard2, CC.xy(17, 12));
		pnl.add(btnSaveCard2, CC.xy(19, 12));
		add(pnl);
		pack();
		setMinimumSize(getSize());
		setVisible(true);
	}

	public void initMemCard(String mcrFile) {
		mdlLstSaveBlocks1.clear();
		if (mcrFile.endsWith(".mcr") || mcrFile.endsWith(".mcd")) {
			File file = Paths.get(mcrFile).toFile();
			float fileSizeInKiloBytes = file.length() / 1024f;
			String pathToMemCard = file.getAbsolutePath();
			List<SaveBlock> saveBlocks = MCRReader.readGames(pathToMemCard);
			List<SaveBlock> filledBlocks = new ArrayList<>();
			String gameNames = "";
			for (int i = 0; i < saveBlocks.size(); i++) {
				SaveBlock block = saveBlocks.get(i);
				if (!block.getGameCode().trim().equals("")) {
					filledBlocks.add(block);
					String realGameName = getRealGameName(block.getGameCode());
					gameNames += realGameName + "\n";
					String replacedString = realGameName == null || realGameName.trim().isEmpty() ? ""
							: realGameName.replace(" ", "+");
//							String flag = ":flag_us:";
//							if (block.getGameCode().toUpperCase().startsWith("SCUS") || block.getGameCode().toUpperCase().startsWith("SLUS")) {
//								 flag = ":flag_us:";	
//							} else if (block.getGameCode().toUpperCase().startsWith("SCES") || block.getGameCode().toUpperCase().startsWith("SLES")) {
//								 flag = ":flag_eu:";	
//							} else if (block.getGameCode().toUpperCase().startsWith("SCPS") || block.getGameCode().toUpperCase().startsWith("SLPS")) {
//								 flag = ":flag_eu:";	
//							}
					// "", flag+"
					// ["+realGameName+"](https://www.youtube.com/results?search_query=ps1+"+replacedString
					// +") - "+block.getGameCode()));
					

					mdlLstSaveBlocks1.addElement(block);
				}
			}
			int freeBlocks = saveBlocks.size() - filledBlocks.size();
			System.out.println(gameNames + freeBlocks + " free blocks remaining");
//					List<ActionComponent> btns = new ArrayList<>();
//					Button btnManageFiles = Button.secondary("manageFiles", ReactionEmoji.unicode("🔽"), "Export Saves ...");
//					Button btnImportFiles = Button.secondary("importFiles", ReactionEmoji.unicode("🔼"), "Import Saves ...");
//					Button btnDeleteFiles = Button.secondary("deleteFiles", ReactionEmoji.unicode("❌"), "Delete Saves ...");
//					Button btnSave = Button.success("downloadMemoryCard", ReactionEmoji.unicode("💾"), "Download");
		}		
	}

	private void initComponents() {
		label1 = new JLabel("Memory Card 1");
		label2 = new JLabel("Memory Card 2");
		lstSaveBlocksMemCard1 = new JList<SaveBlock>(mdlLstSaveBlocks1);
		lstSaveBlocksMemCard2 = new JList<SaveBlock>(mdlLstSaveBlocks2);
		spMemCard1 = new JScrollPane(lstSaveBlocksMemCard1);
		spMemCard2 = new JScrollPane(lstSaveBlocksMemCard2);
		btnCopySlot = new JButton("<<");
		btnDeleteSlot = new JButton(">>");
		btnExportSlot = new JButton("Delete");
		btnImportSlot = new JButton("Export");
		openFileButton1 = new JButton("Open File");
		openFileButton2 = new JButton("Open File");

		btnNewMemCard1 = new JButton("New");
		btnOpenMemCard1 = new JButton("Open");
		btnNewMemCard2 = new JButton("New");
		btnOpenMemCard2 = new JButton("Open");

		btnFormatCard1 = new JButton("Format Card");
		btnFormatCard2 = new JButton("Format Card");
		btnImportCard1 = new JButton("Import Card");
		btnImportCard2 = new JButton("Import Card");
		btnImportFileForCard1 = new JButton("Import File");
		btnImportFileForCard2 = new JButton("Import File");
		btnSaveCard1 = new JButton("Save");
		btnSaveCard2 = new JButton("Save");
	}

	public void addOpenMemCardListener(ActionListener l) {
		btnOpenMemCard1.addActionListener(l);
	}
	
	private void initializeGameCodes() {
		File f = new File(System.getProperty("user.dir") + "\\psx.json");
		URI jsonFile = f.toURI();
		try {
			String allLines = new String(Files.readAllBytes(Paths.get(jsonFile)));
//				try (Stream<String> stream = Files.lines(Paths.get(jsonFile))) {
//			        stream.forEach(System.out::println);
//				}
			
			Gson gson = new Gson();
			java.lang.reflect.Type collectionType = new TypeToken<List<JsonDummyClass>>(){}.getType();
			List<JsonDummyClass> enums = gson.fromJson(allLines, collectionType);
			for (int i = 0; i < enums.size(); i++) {
				JsonDummyClass obj = enums.get(i);
				System.out.println(obj.getGame_gameCode());
				gameCodes.put(obj.getGame_gameCode().toUpperCase(), obj.getGame_name());
			}
//			JSONArray arr = new JSONArray(allLines);
//			System.out.println(arr.length());
//			for (int i = 0; i < arr.length(); i++) {
//				System.out.println(arr.getString(1));
//			}
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

//		JSONArray arr = obj.getJSONArray("posts"); // notice that `"posts": [...]`
//		for (int i = 0; i < arr.length(); i++)
//		{
//		    String post_id = arr.getJSONObject(i).getString("post_id");
//		    ......
//		}
	}

	private String getRealGameName(String gameCode) {
		return gameCodes.get(gameCode.toUpperCase());
	}

	public class JsonDummyClass {
		private String game_name;
		private String game_gameCode;
		
		public JsonDummyClass(String game_name, String game_gameCode) {
			this.game_name = game_name;
			this.game_gameCode = game_gameCode;
		}
		
		public String getGame_name() {
			return game_name;
		}
		
		public String getGame_gameCode() {
			return game_gameCode;
		}
	}
}