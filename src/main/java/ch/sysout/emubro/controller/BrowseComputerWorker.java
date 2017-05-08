package ch.sysout.emubro.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.attribute.DosFileAttributes;
import java.sql.SQLException;
import java.util.List;
import java.util.zip.ZipException;

import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOCase;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.apache.commons.io.filefilter.RegexFileFilter;

import com.github.junrar.exception.RarException;

import ch.sysout.emubro.api.model.Platform;
import ch.sysout.emubro.ui.NotificationElement;
import ch.sysout.util.ValidationUtil;

class BrowseComputerWorker extends SwingWorker<Void, File> {
	private final BroController controller;

	long searchProcessEnded;
	private List<File> files;

	public BrowseComputerWorker(BroController broController, List<File> files) {
		controller = broController;
		this.files = files;
	}

	@Override
	protected Void doInBackground() throws Exception {
		// searchForPlatforms(File.listRoots());
		// File[] files = new File("/media").listFiles();
		searchTest(files);
		return null;
	}

	private void searchTest(List<File> files) {
		for (File root : files) {
			if (!root.canRead()) {
				continue;
			} else {
				searchTest2(root);
			}
		}
	}

	private void searchTest2(File root) {
		String extensionsString = controller.explorer.getExtensionsRegexString();
		IOFileFilter fileFilter = new RegexFileFilter(extensionsString, IOCase.INSENSITIVE) {
			private static final long serialVersionUID = 1L;

			@Override
			public boolean accept(File file) {
				if (controller.workerBrowseComputer.isDone()) {
					return false;
				}
				if (file.isFile()) {
					if (super.accept(file)) {
						String type = file.getName().toLowerCase();
						String filePath = file.getAbsolutePath();
						if (type.endsWith(".zip")) {
							controller.rememberZipFile(filePath);
						} else if (type.endsWith(".rar")) {
							controller.rememberRarFile(filePath);
						} else if (type.endsWith(".iso")) {
							controller.rememberIsoFile(filePath);
						} else {
							try {
								searchForPlatform(file);
							} catch (ZipException e) {
								// TODO Auto-generated catch block
								e.printStackTrace();
							} catch (RarException e) {
								// TODO Auto-generated catch block
								e.printStackTrace();
							} catch (IOException e) {
								// TODO Auto-generated catch block
								e.printStackTrace();
							}
						}
						// return true;
					}
				}
				return false;
			}

			private void searchForPlatform(File filePath) throws ZipException, RarException, IOException {
				boolean useDefaultPlatforms = controller.explorer.getDefaultPlatforms() != null
						&& controller.explorer.getDefaultPlatforms().size() > 0;
						searchForGameOrEmulator(filePath, useDefaultPlatforms);
						// searchForEmulators(filePath, useDefaultPlatforms);

			}

			// private void searchForEmulators(String filePath, boolean
			// useDefaultPlatforms) {
			// // List<Platform> platforms = (List<Platform>)
			// (useDefaultPlatforms ? explorer.getDefaultPlatforms() :
			// explorer.getPlatforms());
			// List<BroPlatform> platforms = explorer.getDefaultPlatforms();
			//
			// for (Platform p : platforms) {
			//
			// }
			// }

			private void searchForGameOrEmulator(File file, boolean useDefaultPlatforms)
					throws ZipException, RarException, IOException {
				String filePath = file.getAbsolutePath();
				if (controller.workerBrowseComputer.isDone()) {
					return;
				}
				try {
					Platform p0 = controller.isGameOrEmulator(filePath, useDefaultPlatforms);
					if (p0 != null) {
						if (controller.explorer.hasGame(filePath)) {
							return;
						}
						controller.addGame(p0, file);
						return;
					} else {
						if (useDefaultPlatforms) {
							searchForGameOrEmulator(file, false);
						}
					}
				} catch (SQLException e1) {
					e1.printStackTrace();
				}
			}
		};

		DirectoryFileFilter dirFilter = new DirectoryFileFilter() {
			private static final long serialVersionUID = 1L;

			@Override
			public boolean accept(File file) {
				if (controller.workerBrowseComputer.isDone() || !file.isDirectory()
						|| controller.isExcludedFileOrDirectory(file)) {
					return false;
				}
				if (ValidationUtil.isWindows()) {
					boolean b = file.getAbsolutePath().equals(root.getAbsolutePath());
					if (!b) {
						DosFileAttributes attr;
						try {
							attr = Files.readAttributes(Paths.get(file.getAbsolutePath()), DosFileAttributes.class);
						} catch (IOException e) {
							System.err.println("ioexception while reading attributes of file " + file.getAbsolutePath()
							+ ": " + "" + e.getMessage());
							return false;
						}
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
							SwingUtilities.invokeLater(new Runnable() {

								@Override
								public void run() {
									controller.view.directorySearched(file.getAbsolutePath());
								}
							});
							return true;
						}
					} else {
						return true;
					}
				} else {
					return super.accept(file);
				}
			}
		};
		FileUtils.iterateFilesAndDirs(root, fileFilter, dirFilter);

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
		// for (File f : chunks) {
		// System.out.println("file: "+f.getAbsolutePath());
		// }
	}

	@Override
	protected void done() {
		try {
			if (!controller.searchProcessInterrupted) {
				NotificationElement element = new NotificationElement(new String[] { "searchProcessCompleted" },
						new String[] { "hideMessage" }, NotificationElement.INFORMATION, null);
				controller.view.showInformation(element);
				controller.explorerDAO.searchProcessComplete();
			}
		} catch (SQLException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		} finally {
			controller.searchProcessInterrupted = false;
			controller.view.searchProcessEnded();
			searchProcessEnded = System.currentTimeMillis();
			System.out.println(searchProcessEnded - controller.searchProcessStarted + " milliseconds");

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
	}
}