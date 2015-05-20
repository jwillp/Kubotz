package com.brm.Kubotz.Systems;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.System.EntitySystem;
import com.brm.Kubotz.Component.UIHealthComponent;

/**
 * Sub System responsible of rendering HUD, on screen elements
 */
public class HUDSystem extends EntitySystem{


    public HUDSystem(EntityManager em) {
        super(em);
    }



    public void render(float dt){

    }


    /**
     * Renders mini health bars over GameObjects
     */
    public void renderMiniHealthBars(){

        // TODO get Shape Renderer
        for(Entity entity : em.getEntitiesWithComponent(UIHealthComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
            HealthComponent health = (HealthComponent)entity.getComponent(HealthComponent.ID);

            Vector2 barPos =  new Vector2(
                    phys.getPosition().x - phys.getWidth()*2,
                    phys.getPosition().y + phys.getHeight() + 0.1f
            );

            Vector2 outlineSize = new Vector2(1, 0.1f);
            float healthWidth = health.getAmount() * outlineSize.x/health.maxAmount;

            shapeRenderer.setProjectionMatrix(this.getCamera().combined);

            //Outline
            shapeRenderer.begin(ShapeRenderer.ShapeType.Line);
            shapeRenderer.setColor(Color.GREEN);
            shapeRenderer.rect(barPos.x, barPos.y, outlineSize.x, outlineSize.y);
            shapeRenderer.end();

            //life
            shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
            shapeRenderer.setColor(Color.GREEN);
            shapeRenderer.rect(barPos.x, barPos.y, healthWidth, outlineSize.y);
            shapeRenderer.end();

        }
    }




}
