package ch.sysout.emubro.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.attribute.DosFileAttributes;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.swing.SwingWorker;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOCase;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.apache.commons.io.filefilter.RegexFileFilter;

import ch.sysout.emubro.api.dao.ExplorerDAO;
import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.emubro.ui.MainFrame;
import ch.sysout.util.ValidationUtil;

class BrowseComputerWorker extends SwingWorker<Void, File> {

	long searchProcessEnded;
	private Explorer explorer;
	private List<File> files;
	private boolean searchProcessInterrupted;
	private List<BrowseComputerListener> listeners = new ArrayList<>();
	private MainFrame view;
	private long searchProcessStarted;
	protected ExplorerDAO explorerDAO;

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
		checkRoots(files);
		return null;
	}

	private void checkRoots(List<File> files) {
		for (File root : files) {
			if (!root.canRead()) {
				continue;
			} else {
				searchRoot(root);
			}
		}
	}

	private void searchRoot(File root) {
		String extensionsString = explorer.getExtensionsRegexString();

		//		String filename = extensionsString;
		//		File baseDir = root;
		//		FindFile ff = new FindFile(filename, baseDir, 6);
		//		ff.findFile(controller);

		IOFileFilter fileFilter = new RegexFileFilter(extensionsString, IOCase.INSENSITIVE) {
			private static final long serialVersionUID = 1L;

			@Override
			public boolean accept(File file) {
				if (isDone()) {
					return false;
				}
				if (file.isFile()) {
					if (super.accept(file)) {
						return true;
					}
				}
				return false;
			}
		};

		DirectoryFileFilter dirFilter = new DirectoryFileFilter() {
			private static final long serialVersionUID = 1L;

			@Override
			public boolean accept(File file) {
				if (isDone() || !file.isDirectory()
						|| explorer.isExcludedFileOrDirectory(file)) {
					return false;
				}
				if (ValidationUtil.isWindows()) {
					boolean b = file.getAbsolutePath().equals(root.getAbsolutePath());
					if (!b) {
						DosFileAttributes attr;
						try {
							attr = Files.readAttributes(Paths.get(file.getAbsolutePath()), DosFileAttributes.class);
							if (attr.isSystem()) {
								System.err.println("attention system file: " + file.getAbsolutePath());
								return false;
							} else if (attr.isHidden()) {
								System.err.println("attention hidden file: " + file.getAbsolutePath());
								return false;
							} else if (attr.isSymbolicLink()) {
								System.err.println("attention symbolic link: " + file.getAbsolutePath());
								return false;
							} else {
								return true;
							}
						} catch (IOException e) {
							System.err.println("ioexception while reading attributes of file " + file.getAbsolutePath()
							+ ": " + "" + e.getMessage());
							return false;
						}
					} else {
						return true;
					}
				} else {
					boolean accept = super.accept(file);
					return accept;
				}
			}
		};
		Iterator<File> it = FileUtils.iterateFilesAndDirs(root, fileFilter, dirFilter);
		while (it.hasNext()) {
			File file = it.next();
			if (file.isDirectory()) {
				System.out.println("iterate: "+ file.getName());
				if (file.getAbsolutePath().toLowerCase().endsWith("\\steam\\steamapps\\common")) {
					fireSteamFolderDetectedEvent(file.getAbsolutePath());
				}
				view.directorySearched(file.getAbsolutePath());
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
					fireSearchForPlatformEvent(file);
				}
			}
		}

		// break;
		// FileUtils.listFiles(root, fileFilter, DirectoryFileFilter.DIRECTORY);
		// while (iterator.hasNext()) {
		// File file = iterator.next();
		// if (file.isFile()) {
		// System.out.println("0 " + file.getAbsolutePath());
		// }
		// }
		// root.listFiles(new FileFilter() {
		//
		// @Override
		// public boolean accept(File file) {
		// if (searchProcessInterrupted) {
		// return false;
		// }
		//
		// if (file.isDirectory()) {
		// searchTest(file);
		// return false;
		// }
		// if (file.getName().endsWith(".zip")) {
		// if (ValidationUtil.isWindows()) {
		// DosFileAttributes attr;
		// try {
		// attr = Files.readAttributes(Paths.get(file.getAbsolutePath()),
		// DosFileAttributes.class);
		// } catch (IOException e) {
		// System.err.println("ioexception while reading attributes of file
		// "+file.getAbsolutePath()+": "
		// + ""+ e.getMessage());
		// return false;
		// }
		// if (attr.isSystem()) {
		// System.err.println("attention system file: "+file.getAbsolutePath());
		// return false;
		// } else if (attr.isHidden()) {
		// System.err.println("attention hidden file: "+file.getAbsolutePath());
		// return false;
		// } else if (attr.isSymbolicLink()) {
		// System.err.println("attention symbolic link:
		// "+file.getAbsolutePath());
		// return false;
		// } else {
		// return doStuff(file);
		// }
		// }
		// return doStuff(file);
		// }
		// return false;
		// }
		//
		// private boolean doStuff(File pathname) {
		// if (isExcludedFileOrDirectory(pathname)) {
		// return false;
		// }
		// try {
		// searchForPlatform(pathname.getAbsolutePath());
		// } catch (ZipException e) {
		// System.err.println(e.getMessage());
		// return false;
		// } catch (RarException e) {
		// System.err.println(e.getMessage());
		// return false;
		// } catch (IOException e) {
		// System.err.println(e.getMessage());
		// return false;
		// }
		// publish(pathname);
		// return true;
		// }
		// });
	}

	@Override
	protected void process(List<File> chunks) {
		for (File file : chunks) {
			if (file.isDirectory()) {

			} else {

			}
		}
	}

	private void fireSearchForPlatformEvent(File file) {
		for (BrowseComputerListener l : listeners) {
			l.searchForPlatform(file);
		}
	}

	private void fireSteamFolderDetectedEvent(String absolutePath) {
		for (BrowseComputerListener l : listeners) {
			l.steamFolderDetected(absolutePath);
		}
	}

	private void fireZipFileDetectedEvent(String filePath) {
		for (BrowseComputerListener l : listeners) {
			l.rememberZipFile(filePath);
		}
	}

	private void fireRarFileDetectedEvent(String filePath) {
		for (BrowseComputerListener l : listeners) {
			l.rememberRarFile(filePath);
		}
	}

	private void fireIsoFileDetectedEvent(String filePath) {
		for (BrowseComputerListener l : listeners) {
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
		for (BrowseComputerListener l : listeners) {
			l.searchProcessComplete();
		}
	}

	public void searchProcessInterrupted() {
		searchProcessInterrupted = true;
	}

	public void addBrowseComputerListener(BroController l) {
		listeners.add(l);
	}
}