const sketch = require('sketch/dom')
const UI = require('sketch/ui')
const document = sketch.getSelectedDocument()
const selection = document.selectedLayers

function runImageOptim(context, files, hidden) {
	if (!files.length) return;

	const workspace = NSWorkspace.sharedWorkspace();
	const bundleIdentifier = 'net.pornel.ImageOptim';
	const appURL = workspace.URLForApplicationWithBundleIdentifier(bundleIdentifier);
	if (!appURL) {
		showMessage(context, 'ImageOptim not installed');
		workspace.openURL(NSURL.URLWithString('https://imageoptim.com/mac?sketch'));
    	return;
	}

	let flags = NSWorkspaceLaunchWithoutAddingToRecents || NSWorkspaceLaunchAsync;
	if (hidden) {
		flags = flags || NSWorkspaceLaunchWithoutActivation || NSWorkspaceLaunchAndHide;
	}

	workspace.openURLs_withAppBundleIdentifier_options_additionalEventParamDescriptor_launchIdentifiers_(
		files, bundleIdentifier, flags, null, null
  );
}

function getURLsToCompress(exportedAssets) {
	const urlsToCompress = []
	for(let i = 0; i < exportedAssets.length; i++) {
	  const asset = exportedAssets.objectAtIndex(i)
	  if (NSFileManager.defaultManager().fileExistsAtPath(asset.path)) {
		urlsToCompress.push(NSURL.fileURLWithPath(asset.path));
	  }
	}
	return urlsToCompress
}

function openFileDialog(path) {
	const openDlg = NSOpenPanel.openPanel();
	openDlg.setTitle('Export & Optimize All Assets In...');
	openDlg.setCanChooseFiles(false);
	openDlg.setCanChooseDirectories(true);
	openDlg.allowsMultipleSelection = false;
	openDlg.setCanCreateDirectories(true);
	openDlg.setPrompt('Export');
	if (path) {
		openDlg.setDirectoryURL(path);
	}
	const buttonClicked = openDlg.runModal();
	if (buttonClicked === NSOKButton) {
		return openDlg.URLs().firstObject().path();
	}
	return null;
}

function exportLayers(folderPath) {
	let format = 'png'
	let scales = ['1', '2', '3']; //iOS
	let layerName, layerRename, path = null;
	var pathArr = NSMutableArray.alloc().init();

	selection.forEach(layer => {
		scales.forEach(scale => {
			let options = {
				output: folderPath,
				formats: format,
				scales: scale,
				overwriting: true,
				trimmed: false,
				'save-for-web': true
			}

			sketch.export(layer, options)
		
			layerName = folderPath + '/' + layer.name + '@' + scale + 'x.' + format;
			layerRename = folderPath + '/' + layer.name + '.' + format;
			if(scale == '1') {
				NSFileManager.defaultManager().moveItemAtPath_toPath_error(layerName, layerRename, nil);
				path = layerRename;
			} else {
				path = layerName;
			}
			pathArr.addObject({path});
		});
	});
	return pathArr;
}

function exportAndCompress(context) {
	if (selection.length === 0) UI.message('No selection layers');
	UI.message('Exporting assets to ImageOptim');

	let exportFolder = openFileDialog();
	if (exportFolder) {
		let exports = exportLayers(exportFolder);
		let urlsToCompress = getURLsToCompress(exports);
		(urlsToCompress.length > 0) ? runImageOptim(context, urlsToCompress, false) : coscript.setShouldKeepAround(false);
	}
}

export default function(context) {
	__mocha__.loadFrameworkWithName('AppKit');
	__mocha__.loadFrameworkWithName('Foundation');
	exportAndCompress(context);
}