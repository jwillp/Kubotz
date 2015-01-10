package com.brm.Kubotz.Renderers;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.Kubotz.Component.AppearanceComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;

/**
 * Used to render a Bounding Box.
 * Useful for Debugging
 */
public class BoundingBoxRenderer {

    private Entity entity;
    private ShapeRenderer shapeRenderer;

    public BoundingBoxRenderer(Entity entity, ShapeRenderer shapeRenderer){
        this.entity = entity;
        this.shapeRenderer = shapeRenderer;
    }


    public void draw(OrthographicCamera cam){
        Rectangle rect = ((PhysicsComponent)entity.getComponent(PhysicsComponent.ID)).getBounds();
        Color color = ((AppearanceComponent)entity.getComponent(AppearanceComponent.ID)).getDebugColor();

        shapeRenderer.setProjectionMatrix(cam.combined);
        shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
        shapeRenderer.setColor(color);
        shapeRenderer.rect(rect.getX(), rect.getY(), rect.getWidth(), rect.getWidth());
        shapeRenderer.end();
    }


}
