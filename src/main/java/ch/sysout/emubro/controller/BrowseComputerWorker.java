package ch.sysout.emubro.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import javax.swing.SwingWorker;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.ui.MainFrame;

class BrowseComputerWorker extends SwingWorker<Void, File> {
	long searchProcessEnded;
	private Explorer explorer;
	private List<File> files;
	private boolean searchProcessInterrupted;
	private List<BrowseComputerListener> browseComputerListeners = new ArrayList<>();
	private MainFrame view;
	private long searchProcessStarted;
	protected ExplorerDAO explorerDAO;
	private File currentRoot;
	private int currentRootIndex;
	private Finder finder;

	public BrowseComputerWorker(MainFrame view, Explorer explorer, ExplorerDAO explorerDAO, List<File> files) {
		this.view = view;
		this.explorer = explorer;
		this.files = files;
		this.explorerDAO = explorerDAO;
	}

	@Override
	protected Void doInBackground() throws Exception {
		searchProcessStarted = System.currentTimeMillis();
		// searchForPlatforms(File.listRoots());
		// File[] files = new File("/media").listFiles();
		searchRoots(files);
		return null;
	}

	//	private void checkRoots(List<File> files) {
	//		for (File root : files) {
	//			if (!root.canRead()) {
	//				continue;
	//			} else {
	//				searchRoot(root);
	//			}
	//		}
	//	}

	private void searchRoots(List<File> files) {
		for (File currentRoot : files) {
			if (currentRoot.canRead()) {
				//				String extensionsString = explorer.getExtensionsRegexString();

				//				//		String filename = extensionsString;
				//				//		File baseDir = root;
				//				//		FindFile ff = new FindFile(filename, baseDir, 6);
				//				//		ff.findFile(controller);
				//
				//				IOFileFilter fileFilter = new RegexFileFilter(extensionsString, IOCase.INSENSITIVE) {
				//					private static final long serialVersionUID = 1L;
				//
				//					@Override
				//					public boolean accept(File file) {
				//						if (isDone()) {
				//							return false;
				//						}
				//						if (file.isFile()) {
				//							if (super.accept(file)) {
				//								publish(file);
				//								return true;
				//							}
				//						}
				//						return false;
				//					}
				//				};
				//
				//				DirectoryFileFilter dirFilter = new DirectoryFileFilter() {
				//					private static final long serialVersionUID = 1L;
				//
				//					@Override
				//					public boolean accept(File file) {
				//						if (isDone() || !file.isDirectory()
				//								|| explorer.isExcludedFileOrDirectory(file)) {
				//							return false;
				//						}
				//						if (ValidationUtil.isWindows()) {
				//							boolean b = file.getAbsolutePath().equals(currentRoot.getAbsolutePath());
				//							if (!b) {
				//								DosFileAttributes attr;
				//								try {
				//									attr = Files.readAttributes(Paths.get(file.getAbsolutePath()), DosFileAttributes.class);
				//									if (attr.isSystem()) {
				//										System.err.println("attention system file: " + file.getAbsolutePath());
				//										return false;
				//									} else if (attr.isHidden()) {
				//										System.err.println("attention hidden file: " + file.getAbsolutePath());
				//										return false;
				//									} else if (attr.isSymbolicLink()) {
				//										System.err.println("attention symbolic link: " + file.getAbsolutePath());
				//										return false;
				//									} else {
				//										publish(file);
				//										return true;
				//									}
				//								} catch (IOException e) {
				//									System.err.println("ioexception while reading attributes of file " + file.getAbsolutePath()
				//									+ ": " + "" + e.getMessage());
				//									return false;
				//								}
				//							} else {
				//								publish(file);
				//								return true;
				//							}
				//						} else {
				//							boolean accept = super.accept(file);
				//							if (accept) {
				//								publish(file);
				//							}
				//							return accept;
				//						}
				//					}
				//				};
				//				FileUtils.listFilesAndDirs(currentRoot, fileFilter, dirFilter);

				//				FileSystemView fsv = FileSystemView.getFileSystemView();
				String str = currentRoot.toString();
				String s = new StringBuilder(str).append(File.separator).toString();
				Path startingDir = Paths.get(s);
				finder = new Finder(explorer, this);
				finder.addDirectorySearchedListener(view);
				finder.addBrowseComputerListener(browseComputerListeners);
				try {
					Files.walkFileTree(startingDir, finder);
				} catch (IOException e) {
					e.printStackTrace();
				}
				finder.done();
			}
		}
	}

	@Override
	protected void process(List<File> chunks) {
		for (File file : chunks) {
			if (file.isDirectory()) {
				//				view.directorySearched(file.getAbsolutePath());
				if (file.getAbsolutePath().toLowerCase().endsWith("\\steam\\steamapps\\common")) {
					fireSteamFolderDetectedEvent(file.getAbsolutePath());
				}
			} else {
				String type = file.getName().toLowerCase();
				String filePath = file.getAbsolutePath();
				if (type.endsWith(".zip")) {
					fireZipFileDetectedEvent(filePath);
				} else if (type.endsWith(".rar")) {
					fireRarFileDetectedEvent(filePath);
				} else if (type.endsWith(".iso")) {
					fireIsoFileDetectedEvent(filePath);
				} else {
					//					fireSearchForPlatformEvent(file);
				}
			}
		}
	}

	private void fireSearchForPlatformEvent(Path file) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.searchForPlatform(file);
		}
	}

	private void fireSteamFolderDetectedEvent(String absolutePath) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.steamFolderDetected(absolutePath);
		}
	}

	private void fireZipFileDetectedEvent(String filePath) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.rememberZipFile(filePath);
		}
	}

	private void fireRarFileDetectedEvent(String filePath) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.rememberRarFile(filePath);
		}
	}

	private void fireIsoFileDetectedEvent(String filePath) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.rememberIsoFile(filePath);
		}
	}

	@Override
	protected void done() {
		if (!searchProcessInterrupted) {
			fireSearchCompleteEvent();
		}
		searchProcessInterrupted = false;
		view.searchProcessEnded();
		searchProcessEnded = System.currentTimeMillis();
		System.out.println(searchProcessEnded - searchProcessStarted + " milliseconds");

		// try {
		// Void result = workerBrowseComputer.get(); // this line can throw
		// InterruptedException or ExecutionException
		// } catch (InterruptedException e) {
		// return;
		// } catch (ExecutionException e) {
		// Throwable cause = e.getCause(); // if SomeException was thrown by
		// the background task, it's wrapped into the ExecutionException
		// if (cause instanceof Exception) {
		// // TODO handle SomeException as you want to
		// e.printStackTrace();
		// }
		// }
	}

	private void fireSearchCompleteEvent() {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.searchProcessComplete();
		}
	}

	public void searchProcessInterrupted() {
		searchProcessInterrupted = true;
	}

	public void addBrowseComputerListener(BrowseComputerListener l) {
		browseComputerListeners.add(l);
	}
}