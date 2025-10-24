 const animationEngine = ( () => {
  let uniqueID = 0;
  class AnimationEngine {
    constructor() {
      this.ids = [];
      this.animations = {};
      this.update = this.update.bind( this );
      this.raf = 0;
      this.time = 0;
    }
    update() {
      const now = performance.now();
      const delta = now - this.time;
      this.time = now;
      let i = this.ids.length;
      this.raf = i ? requestAnimationFrame( this.update ) : 0;
      while ( i-- )
        this.animations[ this.ids[ i ] ] && this.animations[ this.ids[ i ] ].update( delta );
    }
    add( animation ) {
      animation.id = uniqueID ++;
      this.ids.push( animation.id );
      this.animations[ animation.id ] = animation;
      if ( this.raf !== 0 ) return;
      this.time = performance.now();
      this.raf = requestAnimationFrame( this.update );
    }
    remove( animation ) {
      const index = this.ids.indexOf( animation.id );
      if ( index < 0 ) return;
      this.ids.splice( index, 1 );
      delete this.animations[ animation.id ];
      animation = null;
    }
  }
  return new AnimationEngine();
} )();
class Animation {
  constructor( start ) {
    if ( start === true ) this.start();
  }
  start() {
    animationEngine.add( this );
  }
  stop() {
    animationEngine.remove( this );
  }
  update( delta ) {}
}
class World extends Animation {
  constructor( game ) {
    super( true );
    this.game = game;
    this.container = this.game.dom.game;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.container.appendChild( this.renderer.domElement );
    this.camera = new THREE.PerspectiveCamera( 2, 1, 0.1, 10000 );
    this.stage = { width: 2, height: 3 };
    this.fov = 10;
    this.createLights();
    this.onResize = [];
    this.resize();
    window.addEventListener( 'resize', () => this.resize(), false );
  }
  update() {
    this.renderer.render( this.scene, this.camera );
  }
  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize( this.width, this.height );
    this.camera.fov = this.fov;
    this.camera.aspect = this.width / this.height;
    const aspect = this.stage.width / this.stage.height;
    const fovRad = this.fov * THREE.Math.DEG2RAD;
    let distance = ( aspect < this.camera.aspect )
      ? ( this.stage.height / 2 ) / Math.tan( fovRad / 2 )
      : ( this.stage.width / this.camera.aspect ) / ( 2 * Math.tan( fovRad / 2 ) );
    distance *= 0.5;
    this.camera.position.set( distance, distance, distance);
    this.camera.lookAt( this.scene.position );
    this.camera.updateProjectionMatrix();
    const docFontSize = ( aspect < this.camera.aspect )
      ? ( this.height / 100 ) * aspect
      : this.width / 100;
    document.documentElement.style.fontSize = docFontSize + 'px';
    if ( this.onResize ) this.onResize.forEach( cb => cb() );
  }
  createLights() {
    this.lights = {
      holder:  new THREE.Object3D,
      ambient: new THREE.AmbientLight( 0xffffff, 0.69 ),
      front:   new THREE.DirectionalLight( 0xffffff, 0.36 ),
      back:    new THREE.DirectionalLight( 0xffffff, 0.19 ),
    };
    this.lights.front.position.set( 1.5, 5, 3 );
    this.lights.back.position.set( -1.5, -5, -3 );
    this.lights.holder.add( this.lights.ambient );
    this.lights.holder.add( this.lights.front );
    this.lights.holder.add( this.lights.back );
    this.scene.add( this.lights.holder );
  }
}
function RoundedBoxGeometry( size, radius, radiusSegments ) {
  THREE.BufferGeometry.call( this );
  this.type = 'RoundedBoxGeometry';
  radiusSegments = ! isNaN( radiusSegments ) ? Math.max( 1, Math.floor( radiusSegments ) ) : 1;
  var width, height, depth;
  width = height = depth = size;
  radius = size * radius;
  radius = Math.min( radius, Math.min( width, Math.min( height, Math.min( depth ) ) ) / 2 );
  var edgeHalfWidth = width / 2 - radius;
  var edgeHalfHeight = height / 2 - radius;
  var edgeHalfDepth = depth / 2 - radius;
  this.parameters = {
    width: width,
    height: height,
    depth: depth,
    radius: radius,
    radiusSegments: radiusSegments
  };
  var rs1 = radiusSegments + 1;
  var totalVertexCount = ( rs1 * radiusSegments + 1 ) << 3;
  var positions = new THREE.BufferAttribute( new Float32Array( totalVertexCount * 3 ), 3 );
  var normals = new THREE.BufferAttribute( new Float32Array( totalVertexCount * 3 ), 3 );
  var
    cornerVerts = [],
    cornerNormals = [],
    normal = new THREE.Vector3(),
    vertex = new THREE.Vector3(),
    vertexPool = [],
    normalPool = [],
    indices = []
  ;
  var
    lastVertex = rs1 * radiusSegments,
    cornerVertNumber = rs1 * radiusSegments + 1
  ;
  doVertices();
  doFaces();
  doCorners();
  doHeightEdges();
  doWidthEdges();
  doDepthEdges();
  function doVertices() {
    var cornerLayout = [
      new THREE.Vector3( 1, 1, 1 ),
      new THREE.Vector3( 1, 1, - 1 ),
      new THREE.Vector3( - 1, 1, - 1 ),
      new THREE.Vector3( - 1, 1, 1 ),
      new THREE.Vector3( 1, - 1, 1 ),
      new THREE.Vector3( 1, - 1, - 1 ),
      new THREE.Vector3( - 1, - 1, - 1 ),
      new THREE.Vector3( - 1, - 1, 1 )
    ];
    for ( var j = 0; j < 8; j ++ ) {
      cornerVerts.push( [] );
      cornerNormals.push( [] );
    }
    var PIhalf = Math.PI / 2;
    var cornerOffset = new THREE.Vector3( edgeHalfWidth, edgeHalfHeight, edgeHalfDepth );
    for ( var y = 0; y <= radiusSegments; y ++ ) {
      var v = y / radiusSegments;
      var va = v * PIhalf;
      var cosVa = Math.cos( va );
      var sinVa = Math.sin( va );
      if ( y == radiusSegments ) {
        vertex.set( 0, 1, 0 );
        var vert = vertex.clone().multiplyScalar( radius ).add( cornerOffset );
        cornerVerts[ 0 ].push( vert );
        vertexPool.push( vert );
        var norm = vertex.clone();
        cornerNormals[ 0 ].push( norm );
        normalPool.push( norm );
        continue;
      }
      for ( var x = 0; x <= radiusSegments; x ++ ) {
        var u = x / radiusSegments;
        var ha = u * PIhalf;
        vertex.x = cosVa * Math.cos( ha );
        vertex.y = sinVa;
        vertex.z = cosVa * Math.sin( ha );
        var vert = vert =vertex.clone().multiplyScalar( radius ).add( corneroffset );
        cornerVerts[ 0 ].push( vert );
        vertexPool.push( vert );
        var norm = vertex.clone().normalize();
        cornerNormals[ 0 ].push( norm );
        normalPool.push( norm );
      }
    }
    for (var i = 1; i < 8; i ++ ) {
      for (var j = 0; j < cornerVerts[ 0 ].length; j ++ ) {
        var vert = cornerVerts[ 0 ][ j ].clone().multiply( cornerLayout[ i ] );
        cornerVerts[ i ].push( vert );
        vertexPool.push( vert );
        var norm = cornerNormals[ 0 ][ j ].clone().multiply( cornerLayout[ i ] );
        cornerNormals[ i ].push( norm );
        normalPool.push( morm );
      }
    }
  }
  function doCorners() {
    var flips = [
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true
    ];
    var lastRowOffset = rs1 * ( radiusSegments - 1 );
    for ( var i = 0; i < 8; i ++ ) {
      var cornerOffset = cornerVertNumber * i;
      for ( var v = 0; v < radiusSegments -1; v ++ ) {
        var r1 = v * rs1;
        var r2 = ( v + 1 ) * rs1;
        for ( var u = 0; u < radiusSegments; u ++ ) {
          var u1 = u + 1;
          var a = cornerOffset + r1 + u;
          var b = cornerOffset + r1 + u1;
          var c = cornerOffset + r2 + u;
          var d = cornerOffset + r2 + u1;
          if ( ! flips[ i ] ) {
            indices.push( a );
            indices.push( b );
            indices.push( c );
            indices.push( b );
            indices.push( d );
            indices.push( c );
          } else {
            indices.push( a );
            indices.push( c );
            indices.push( b );
            indices.push( b );
            indices.push( c );
            indices.push( d );
          }
        }
    }
    