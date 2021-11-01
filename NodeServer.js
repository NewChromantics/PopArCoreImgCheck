import os from 'os'
import ExpressModule from 'express'
import * as ArCoreImg from './ArCoreImg.js'


//	if this import errors because of the file type, make sure we run with 
//		--experimental-json-modules
//	ie; node --experimental-json-modules ./NodeServer.js
//const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url)));
import PackageJson from './package.json'
//	todo: work out if we can read docker's tag
let Version = process.env.VERSION || PackageJson.version;
console.log(`Version=${Version}`);


//	multi-part file form support
//	https://stackoverflow.com/questions/23114374/file-uploading-with-express-4-0-req-files-undefined
import ExpressFileUpload from "express-fileupload";



const CorsOrigin = process.env.CorsOrigin || '*';
const ErrorStatusCode = 500;
const HttpListenPort = process.env.ListenPort || 80;



//	API routing
const HttpServerApp = ExpressModule();


//	enable express-fileupload support
//	https://github.com/richardgirges/express-fileupload/tree/da968ef0365eba4bad73909737700798d89d2ad7#available-options
const FileUploadOptions = {};
FileUploadOptions.useTempFiles = true;	//	need temp files to put into process
//FileUploadOptions.createParentPath = true;	//	create paths with .mv()
FileUploadOptions.safeFileNames = true;
FileUploadOptions.preserveExtension = true;	//	need extensions for arcoreimg
HttpServerApp.use(ExpressFileUpload(FileUploadOptions));


const RootUrlPattern = new RegExp(`^/$`);	
const FileUrlPattern = new RegExp(`^/(.*)$`);
const GetVersionUrl = new RegExp(`^/Version$`);
const UploadImageUrl = new RegExp(`^/UploadImage$`);

HttpServerApp.get(GetVersionUrl,HandleGetVersion);
HttpServerApp.post(UploadImageUrl,HandleUploadImage);
HttpServerApp.get(RootUrlPattern,HandleFileUrl);
HttpServerApp.get(FileUrlPattern,HandleFileUrl);

const HttpServer = HttpServerApp.listen( HttpListenPort, () => console.log( `http server on ${JSON.stringify(HttpServer.address())}` ) );


function HandleFileUrl(req,res,next)
{
	let Filename = req.params[0];
	console.log(`File Url ${Filename}`);
	if ( !Filename || Filename.length == 0 )
		Filename = '/';
	req.url = Filename;
	ExpressModule.static('./')(req, res, next);
}


async function HandleResponse(Function,Request,Response)
{
	try
	{
		let Output = await Function(Request);

		//	if a string returned, auto convert to string content
		if ( typeof Output == typeof '' )
		{
			const Content = Output;
			Output = {};
			Output.Content = Content;
		}		

		//	PopImageServer generic code
		Output.StatusCode = Output.StatusCode || 200;
		Output.Mime = Output.Mime || 'text/plain';

		Response.statusCode = Output.StatusCode;
		Response.setHeader('Content-Type',Output.Mime);
		Response.setHeader('access-control-allow-origin','*');
		
		Response.end(Output.Content);
	}
	catch (e)
	{
		console.log(`HandleResponse error -> ${e}`);
		Response.statusCode = ErrorStatusCode;
		Response.setHeader('Content-Type','text/plain');
		Response.end(`Error ${e}`);
	}
}


async function HandleGetContentJson(Request,Response)
{
	async function Run(Request)
	{
		const Location = {};
		Location.Longitude = Request.params[0];	//	regex url param
		Location.Latitude = Request.params[1];	//	regex url param
		
		const Data = await JrApi.GetContent(Location);
		return JSON.stringify(Data,null,'\t');
	}
	return HandleResponse( Run, Request, Response );
}


async function HandleUploadImage(Request,Response)
{
	async function Run(Request)
	{
		console.log(`HandleUploadImage...`);
		//	get file
		//	this comes through as a single file, despite the name
		if ( !Request.files )
			throw `Request.files is ${Request.files} expected object`;
		if ( Array.isArray(Request.files) )
			throw `Request.files is an array, should be single object`;
/*
uploaded form.append('content',blob);
Request.files = {
	content: {
		name: 'blob',
		data: <Buffer ff d8 ff e0 00 10 4a 46 49 46 00 01 01 00 00 01 00 01 00 00 ff db 00 43 00 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 01 ... 116932 more bytes>,
		size: 116982,
		encoding: '7bit',
		tempFilePath: '',
		truncated: false,
		mimetype: 'image/jpeg',
		md5: '38d932cd06d836980e454f8f43ea9bb4',
		mv: [Function: mv]
	}
}*/
		//	gr: don't seem to be getting filename formdata through, so we get one object of bytes
		//	gr: We do now! (updated verison of express-fileupload?)
		//const UploadedFile = Request.files.content;
		const ImageKey = 'Image_jpg';
		const UploadedFile = Request.files[ImageKey];
		if ( !UploadedFile )
		{
			console.log(`Request.files=${JSON.stringify(Request.files,null,'\t')}`);
			throw `No uploaded file content`;
		}

		//console.log(`Request.files=${JSON.stringify(Request.files,null,'\t')}`);
		let ImageTempFilename = UploadedFile.tempFilePath;
		//	force a file extension... preserveExtension is there, but not working...
		ImageTempFilename = `${ImageTempFilename}.jpg`;
		UploadedFile.mv(ImageTempFilename);
		
		let Result = await ArCoreImg.GetTestImageResult( ImageTempFilename );

		Result = JSON.stringify( Result, null, '\t' );

		console.log(`output ${Result}`);	

		return Result;
	}
	return HandleResponse( Run, Request, Response );
}


async function HandleGetVersion(Request,Response)
{
	async function Run(Request)
	{
		return Version;
	}
	return HandleResponse( Run, Request, Response );
}

