type ShaderType =
    | WebGL2RenderingContext['FRAGMENT_SHADER']
    | WebGL2RenderingContext['VERTEX_SHADER'];

export class ShaderProgram {
  private readonly context: WebGL2RenderingContext;
  private readonly name: string;

  private readonly associatedShaders: Record<ShaderType, WebGLShader>;
  private program: WebGLProgram;

  constructor(context: WebGL2RenderingContext, name: string) {
    this.associatedShaders = {};

    this.context = context;
    this.name = name;
  }

  getGLShader() {
    return this.program;
  }

  declareVertexShader(source: string) {
    let type: ShaderType = this.context.VERTEX_SHADER;
    this.associatedShaders[type] = this.createShader(source, type);

    // console.info(`Shader Program - ${this.name}: Vertex Shader declared and compiled successfully!`);
    return this;
  }

  declareFragmentShader(source: string) {
    let type: ShaderType = this.context.FRAGMENT_SHADER;
    this.associatedShaders[type] = this.createShader(source, type);

    // console.info(`Shader Program - ${this.name}: Fragment Shader declared and compiled successfully!`);
    return this;
  }

  build() {
    const program = this.context.createProgram();
    for (let shaderType in this.associatedShaders)
      this.context.attachShader(program, this.associatedShaders[shaderType]);
    this.context.linkProgram(program);
    if (!this.context.getProgramParameter(program, this.context.LINK_STATUS))
      throw new Error(this.context.getProgramInfoLog(program));

    this.program = program;
    return this;
  }

  bind() {
    this.context.useProgram(this.program);
  }

  unbind() {
    this.context.useProgram(null);
  }

  dispose() {
    for (let shaderType in this.associatedShaders)
      this.context.detachShader(
        this.program,
        this.associatedShaders[shaderType]
      );

    for (let shaderType in this.associatedShaders)
      this.context.deleteShader(this.associatedShaders[shaderType]);
  }

  private createShader(source: string, type: ShaderType) {
    const shader: WebGLShader = this.context.createShader(type);
    this.context.shaderSource(shader, source);
    this.context.compileShader(shader);

    if (!this.context.getShaderParameter(shader, this.context.COMPILE_STATUS))
      throw new Error(this.context.getShaderInfoLog(shader));
    if (this.associatedShaders[type])
      this.context.deleteShader(this.associatedShaders[type]);

    return shader;
  }
}