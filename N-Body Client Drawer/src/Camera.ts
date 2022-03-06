import {glMatrix, mat4, vec3} from "gl-matrix";

export class Camera {
    private readonly ProjectionMatrix: mat4;
    private readonly ViewMatrix: mat4;

    protected readonly Up: vec3;
    protected Position: vec3;
    protected Target: vec3;

    protected NEAR_DISTANCE = 1.0;
    protected FAR_DISTANCE = 2500000.0;

    constructor(position: vec3, target: vec3, up: vec3) {
        this.Position = position;
        this.Target = target;
        this.Up = up;

        this.ProjectionMatrix = mat4.create();
        this.ViewMatrix = mat4.create();
    }

    update(width: number, height: number) {
        const aspectRatio = width / height;

        mat4.perspective(
            this.ProjectionMatrix,
            glMatrix.toRadian(60.0),
            aspectRatio,
            this.NEAR_DISTANCE,
            this.FAR_DISTANCE
        );
        mat4.lookAt(this.ViewMatrix, this.Position, this.Target, this.Up);
    }

    getTarget(): vec3 {
        return this.Target;
    }

    getPosition(): vec3 {
        return this.Position;
    }

    getCombinedMatrix(): mat4 {
        let combinedMatrix = mat4.create();
        mat4.mul(combinedMatrix, this.ProjectionMatrix, this.ViewMatrix);
        return combinedMatrix;
    }

    getProjectionMatrix(): mat4 {
        return this.ProjectionMatrix;
    }

    getViewMatrix(): mat4 {
        return this.ViewMatrix;
    }

    setPosition(position: vec3) {
        this.Position = position;
    }

    setTarget(target: vec3) {
        this.Target = target;
    }
}