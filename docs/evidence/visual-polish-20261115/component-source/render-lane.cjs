globalThis.__DEV__=false;
const fs=require('fs'), React=require('react'),crypto=require('crypto');
(async()=>{
 globalThis.CanvasKit=await require('canvaskit-wasm')({wasmBinary:fs.readFileSync(require.resolve('canvaskit-wasm/bin/canvaskit.wasm'))});
 const api=require('@shopify/react-native-skia/lib/commonjs/headless');
 const {Skia}=api.getSkiaExports();const face=Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync('assets/fonts/Inter-Regular.ttf'))));
 const source=fs.readFileSync('tmp/web-component-render/lane.cjs','utf8'),mod={exports:{}};
 new Function('require','module','exports',source)(id=>{
  if(id==='@shopify/react-native-skia')return {...api,Skia,Canvas:'Canvas',vec:(x,y)=>({x,y}),rect:(x,y,width,height)=>({x,y,width,height}),rrect:(rect,rx,ry)=>({rect,rx,ry}),matchFont:props=>Skia.Font(face,props.fontSize)};
  if(id==='react-native')return {StyleSheet:{hairlineWidth:1,create:x=>x},Platform:{select:x=>x.android}};
  if(id==='react')return {...React,useMemo:f=>f(),useCallback:f=>f,useRef:v=>({current:v})};
  if(id==='react-native-reanimated')return {useDerivedValue:f=>({__fixture:true,get value(){return f()}}),useSharedValue:v=>({__fixture:true,value:v}),useFrameCallback:()=>{},useAnimatedReaction:()=>{},useReducedMotion:()=>true};
  if(id.endsWith('.png'))return 1;
  return require(id);
 },mod,mod.exports);
 const sv=value=>({__fixture:true,value});
 const states=[{width:360,height:420,playheadX:110,pxPerMs:.10,notes:[60,62,64,65,67].map((midi,i)=>({id:String(i),midi,startMs:i*900,durationMs:800,syllable:'ah'})),displayTimeMs:sv(400),head:sv(null),trailRing:sv({capacity:1,times:[0],midis:[NaN],zones:[0],targets:[NaN],start:0,count:0}),visibleRange:{first:0,end:5},pitchWindow:{span:{minMidi:55,maxMidi:72},minMidi:sv(55),maxMidi:sv(72)},hitStates:{},flames:null,lick:null,onPitchCents:20,ignition:{bar:sv(-1),armed:false,fire:false},skin:'classic',style:'classical'}];
 const native=new Set(Object.values(api));
 function unwrap(v){if(v?.__fixture)return unwrap(v.value);if(Array.isArray(v))return v.map(unwrap);return v;}
 function flatten(n){if(n==null||typeof n!=='object')return n;if(Array.isArray(n))return n.map((v,i)=>{const f=flatten(v);return React.isValidElement(f)?React.cloneElement(f,{key:f.key??i}):f});if(n.type===React.Fragment)return flatten(n.props.children);if(n.type?.type)return flatten(n.type.type(n.props));if(typeof n.type==='function'&&!native.has(n.type))return flatten(n.type(n.props));const props=Object.fromEntries(Object.entries(n.props).map(([k,v])=>[k,k==='children'?flatten(v):unwrap(v)]));return React.createElement(n.type,{...props,...(n.key!=null?{key:n.key}:{})});}
 for(let i=0;i<states.length;i++){
  const props=states[i];
  const tree=mod.exports.NoteLaneCanvas(props);
  const {SkiaSGRoot}=require('@shopify/react-native-skia/lib/commonjs/sksg/Reconciler.js'); const root=new SkiaSGRoot(Skia); await root.render(React.createElement(React.Fragment,null,flatten(tree.props.children))); const surface=api.makeOffscreenSurface(720,840); surface.getCanvas().clear(Skia.Color('#080706')); surface.getCanvas().scale(2,2); root.drawOnCanvas(surface.getCanvas()); surface.flush(); const image=surface.makeImageSnapshot();
  fs.writeFileSync(`tmp/web-component-render/lane-${i}.png`,Buffer.from(image.encodeToBytes()));image.dispose(); await root.unmount(); surface.dispose();
 }
 fs.writeFileSync('tmp/web-component-render/lane-manifest.json',JSON.stringify({classification:'Production NoteLaneCanvas children rendered with CanvasKit CPU and synthetic props; no full screen or installed APK parity claimed',commit:require('child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),props:states,inputs:Object.keys(JSON.parse(fs.readFileSync('tmp/web-component-render/lane-inputs.json')).inputs).map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
