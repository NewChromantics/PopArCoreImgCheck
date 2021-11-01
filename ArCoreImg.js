import { spawn } from 'child_process'


//const ExePathMac = `./arcore-android-sdk/tools/arcoreimg/macos/arcoreimg`;
const ExePathWindows = `./arcore-android-sdk/tools/arcoreimg/windows/arcoreimg.exe`;
//	gr: what arch is this!
const ExePathLinux = `./arcore-android-sdk/tools/arcoreimg/linux/arcoreimg`;

const ExePathMac = `/Users/graham/Library/Unity/cache/packages/packages.unity.com/com.unity.xr.arcore@4.1.7/Tools~/MacOS/arcoreimg`;

function GetExePath()
{
	const Platform = process.platform;
	
	switch ( Platform )
	{
		case 'darwin':
			return ExePathMac;
			
		case 'win32':
			return ExePathWindows;
			
		default:
			return ExePathLinux;
	}
}


//	create a promise function with the Resolve & Reject functions attached so we can call them
function CreatePromise()
{
	let Callbacks = {};
	let PromiseHandler = function(Resolve,Reject)
	{
		Callbacks.Resolve = Resolve;
		Callbacks.Reject = Reject;
	}
	let Prom = new Promise(PromiseHandler);
	Prom.Resolve = Callbacks.Resolve;
	Prom.Reject = Callbacks.Reject;
	return Prom;
}

export default `Hello`;

export async function GetTestImageResult(ImageFilename)
{
	const ExePath = GetExePath();
	
	//	arcoreimg will fail if extension is wrong/missing, regardless of content
	console.log(`Executing `,ExePath,'eval-img','--input_image_path',ImageFilename);
	// All executables are added as part of the final meta data file
	const Exe = spawn( ExePath, [
		'eval-img',
		'--input_image_path',
		ImageFilename
	] );
	
	let Score = null;
	const Logs = [];
	const Errors = [];
	const FinishedPromise = CreatePromise();
	
	Exe.stdout.on( "data", ( data ) =>
	{
		console.log( `stdout: ${data}` );
		Logs.push( `${data}` );
		
		const Number = parseInt(data);
		if ( !isNaN(Number) )
			Score = Number;
	} );

	Exe.stderr.on( 'data', ( data ) =>
	{
		console.log( `stderr: ${data}` );
		Errors.push( `${data}` );
	} );

	Exe.on( 'error', ( error ) =>
	{
		console.log( `error: ${error.message}` );
		Errors.push( `${error.message}` );
		FinishedPromise.Reject(Error.message);
	} );

	Exe.on( "close", ( code ) =>
	{
		console.log("Finished")
		FinishedPromise.Resolve();
	} );
	
	//	wait for error/close and the process to finish...
	await FinishedPromise;
	
	if ( Score === null )
		Errors.push(`Failed to find a number in output`);
	
	const Result = {};
	Result.Log = Logs.join('\n');
	
	if ( Score !== null )
		Result.Score = Score;

	if ( Errors.length )
		Result.Error = Errors.join('\n');

	//console.log(`Returning ${JSON.stringify(Result,null,'\t')}`);	
	return Result;
}
