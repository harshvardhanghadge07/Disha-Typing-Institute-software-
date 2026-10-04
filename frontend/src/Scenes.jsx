import {Canvas,useFrame} from '@react-three/fiber';import {Float,OrbitControls,ContactShadows} from '@react-three/drei';import {useRef} from 'react';
const brass='#d4a24c',enamel='#1f6f68',ink='#0b1319';
function Computer(){const g=useRef(),cur=useRef();
 useFrame(({clock:c,pointer:p})=>{g.current.rotation.y=p.x*.35-.35;g.current.rotation.x=-p.y*.1;cur.current.visible=Math.floor(c.elapsedTime*2)%2===0});
 return <Float speed={1.5} floatIntensity={.4}><group ref={g}>
  <mesh position={[0,.5,0]}><boxGeometry args={[3.2,2.4,.3]}/><meshStandardMaterial color="#cfd6d4" roughness={.4}/></mesh>
  <mesh position={[0,.5,.16]}><planeGeometry args={[2.8,2]}/><meshStandardMaterial color="#06241f" emissive="#3fb5a3" emissiveIntensity={.5}/></mesh>
  {[.55,.25,-.05].map((y,i)=><mesh key={i} position={[-.6+i*.1,y+.5,.17]}><planeGeometry args={[1.2-i*.2,.08]}/><meshBasicMaterial color="#7ff0dc"/></mesh>)}
  <mesh ref={cur} position={[-.9,-.1,.17]}><planeGeometry args={[.12,.2]}/><meshBasicMaterial color="#7ff0dc"/></mesh>
  <mesh position={[0,-.95,-.1]}><boxGeometry args={[.4,.6,.3]}/><meshStandardMaterial color="#aab3b1"/></mesh>
  <mesh position={[0,-1.3,0]}><boxGeometry args={[1.6,.12,1]}/><meshStandardMaterial color="#aab3b1"/></mesh>
  <mesh position={[0,-1.45,1.9]} rotation={[.12,0,0]}><boxGeometry args={[3.2,.15,1.1]}/><meshStandardMaterial color="#cfd6d4"/></mesh>
  {Array.from({length:30}).map((_,i)=><mesh key={i} position={[-1.4+(i%10)*.31,-1.35,1.55+Math.floor(i/10)*.3]}><boxGeometry args={[.25,.08,.25]}/><meshStandardMaterial color="#1b2a31"/></mesh>)}
 </group></Float>}
function Key({x,z,i}){const r=useRef();useFrame(({clock:c})=>{const t=(c.elapsedTime*3+i*1.7)%9;r.current.position.y=.62-(t<.25?.1:0)});
 return <mesh ref={r} position={[x,.62,z]}><cylinderGeometry args={[.15,.15,.1,20]}/><meshStandardMaterial color="#10191e" metalness={.3} roughness={.3}/></mesh>}
function Typewriter(){const paper=useRef(),car=useRef();
 useFrame(({clock:c})=>{const t=c.elapsedTime;paper.current.position.y=1.7+((t*.08)%.6);car.current.position.x=Math.sin(t*1.2)*.45});
 const keys=[];[[9,.5],[8,1],[7,1.5]].forEach(([n,z],r)=>{for(let i=0;i<n;i++)keys.push(<Key key={r+'-'+i} i={keys.length} x={(i-(n-1)/2)*.4+r*.1} z={z+.3}/>)});
 return <Float speed={1.2} floatIntensity={.3}><group rotation={[.15,-.4,0]} scale={1.1}>
  <mesh position={[0,0,.6]}><boxGeometry args={[4.4,.5,2.6]}/><meshStandardMaterial color={enamel} roughness={.35}/></mesh>
  <mesh position={[0,.45,.9]} rotation={[.35,0,0]}><boxGeometry args={[4,.5,2]}/><meshStandardMaterial color={enamel} roughness={.35}/></mesh>
  {keys}
  <group ref={car}><mesh position={[0,1.3,-.5]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.28,.28,4.2,28]}/><meshStandardMaterial color={ink} roughness={.4}/></mesh>
   <mesh ref={paper} position={[0,1.7,-.78]}><planeGeometry args={[2.6,2]}/><meshStandardMaterial color="#e9e6dc" side={2}/></mesh>
   {[2.1,1.9,1.7].map((y,i)=><mesh key={i} position={[-.5,y,-.77]}><planeGeometry args={[1.5-i*.3,.04]}/><meshBasicMaterial color="#1a1a1a"/></mesh>)}
   {[-2.3,2.3].map(x=><mesh key={x} position={[x,1.3,-.5]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.4,.4,.15,24]}/><meshStandardMaterial color={brass} metalness={.8} roughness={.25}/></mesh>)}</group>
 </group></Float>}
export default function Scene({kind}){return <Canvas camera={{position:[0,1.2,7],fov:42}} dpr={[1,2]}>
 <ambientLight intensity={.7}/><directionalLight position={[4,6,5]} intensity={1.6}/><pointLight position={[-4,2,3]} color="#d4a24c" intensity={20}/>
 {kind==='pc'?<Computer/>:<Typewriter/>}<ContactShadows position={[0,-2,0]} opacity={.4} blur={2.5} scale={12}/>
 <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={1.2} maxPolarAngle={1.8}/></Canvas>}
