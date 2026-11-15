const fs=require('fs'), React=require('react'),crypto=require('crypto');
(async()=>{
 globalThis.CanvasKit=await require('canvaskit-wasm')({wasmBinary:fs.readFileSync(require.resolve('canvaskit-wasm/bin/canvaskit.wasm'))});
 const api=require('@shopify/react-native-skia/lib/commonjs/headless');
 const {Skia}=api.getSkiaExports();
 const source=fs.readFileSync('tmp/web-component-render/ready.cjs','utf8'),mod={exports:{}};
 new Function('require','module','exports',source)(id=>{
  if(id==='@shopify/react-native-skia')return {...api,Skia,Canvas:'Canvas',vec:(x,y)=>({x,y})};
  if(id==='react-native')return {StyleSheet:{hairlineWidth:1,create:x=>x}};
  return require(id);
 },mod,mod.exports);
 const states=[{phase:'onsets',progress:.1,onsetsHeard:1,liveMidi:null,bridge:null,range:null},{phase:'siren',progress:.5,onsetsHeard:3,liveMidi:66,bridge:{lowMidi:62,highMidi:67},range:{lowestMidi:48,highestMidi:79}}];
 for(let i=0;i<states.length;i++){
  const props={width:360,height:168,...states[i]};
  const tree=mod.exports.ReadyCheckCanvas(props);
  const {SkiaSGRoot}=require('@shopify/react-native-skia/lib/commonjs/sksg/Reconciler.js'); const root=new SkiaSGRoot(Skia); await root.render(React.createElement(React.Fragment,null,tree.props.children)); const surface=api.makeOffscreenSurface(720,336); surface.getCanvas().clear(Skia.Color('#080706')); surface.getCanvas().scale(2,2); root.drawOnCanvas(surface.getCanvas()); surface.flush(); const image=surface.makeImageSnapshot();
  fs.writeFileSync(`tmp/web-component-render/ready-${i}.png`,Buffer.from(image.encodeToBytes()));image.dispose(); await root.unmount(); surface.dispose();
 }
 fs.writeFileSync('tmp/web-component-render/manifest.json',JSON.stringify({classification:'Production ReadyCheckCanvas children rendered with CanvasKit CPU and synthetic props; no full screen or installed APK parity claimed',commit:require('child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),props:states,inputs:Object.keys(JSON.parse(fs.readFileSync('tmp/web-component-render/inputs.json')).inputs).map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}))},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
