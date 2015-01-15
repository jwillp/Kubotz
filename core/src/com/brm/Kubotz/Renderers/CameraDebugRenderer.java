package com.brm.Kubotz.Renderers;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;

/**
 * To display on screen the camera position
 */
public class CameraDebugRenderer {
    OrthographicCamera camera;
    ShapeRenderer shapeRenderer;

    public CameraDebugRenderer(OrthographicCamera camera, ShapeRenderer shapeRenderer){
        this.camera = camera;
        this.shapeRenderer = shapeRenderer;
    }

    public void render(){
        shapeRenderer.setProjectionMatrix(camera.combined);
        shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
        shapeRenderer.setColor(Color.CYAN);

        float pointSize = 0.1f;
        shapeRenderer.rect(camera.position.x-pointSize/2,
                camera.position.y-pointSize/2, pointSize, pointSize);

        float camViewSize = 2;
        shapeRenderer.rect(camera.position.x-camViewSize/2, camera.position.y-camViewSize/2, camViewSize, camViewSize);
        shapeRenderer.end();
    }


}
