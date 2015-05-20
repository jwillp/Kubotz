package com.brm.Kubotz.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Matrix4;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.brm.GoatEngine.ECS.Components.HealthComponent;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;
import com.brm.GoatEngine.ECS.Entity.EntityManager;
import com.brm.GoatEngine.ECS.Systems.EntitySystem;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Component.UIHealthComponent;
import com.brm.Kubotz.Config;
import com.brm.Kubotz.Systems.RendringSystems.RenderingSystem;

import javax.xml.soap.Text;

/**
 * Sub System responsible of rendering HUD, on screen elements
 */
public class HUDSystem extends EntitySystem {

    private final OrthographicCamera hudCamera;

    private final ShapeRenderer shapeRenderer;
    private final SpriteBatch spriteBatch;




    private Texture badge = new Texture(Gdx.files.internal("hud-multi-badge.png"));
    private Texture timer = new Texture(Gdx.files.internal("hud-multi-timer.png"));
    private Texture bars = new Texture(Gdx.files.internal("hud-multi-bars.png"));

    public HUDSystem(EntityManager em, ShapeRenderer shapeRenderer, SpriteBatch spriteBatch) {
        super(em);
        this.shapeRenderer = shapeRenderer;
        this.spriteBatch = spriteBatch;

        hudCamera = new OrthographicCamera(1280,768);

    }


    /**
     * Calculates the correct coordinates of an image
     * positioned from the bottom left corner of the HUD
     * @return
     */
    private Vector2 getHudCoord(float x, float y){
        return new Vector2(-1280/2 + x, -768/2+y);
    }





    @Override
    public void init() {

    }

    @Override
    public void update(float dt){
        this.renderMiniHealthBars();


        //HUD Matrix
        //Matrix4 hudMatrix = getSystemManager().getSystem(RenderingSystem.class).getCamera().combined.cpy();
        //hudMatrix.setToOrtho2D(0,0, Config.V_WIDTH, Config.V_HEIGHT);
        //spriteBatch.setProjectionMatrix(hudMatrix);
        spriteBatch.setProjectionMatrix(hudCamera.combined);
        spriteBatch.begin();


        spriteBatch.draw(this.timer, 0-this.timer.getWidth()/2,768/2 - this.timer.getHeight());

        spriteBatch.draw(this.bars, -1280/2 + this.badge.getWidth()/2 + 30, 768/2 -this.badge.getHeight()/2);
        spriteBatch.draw(this.badge, -1280/2, 768/2 - this.badge.getHeight());



        spriteBatch.end();

    }





    /**
     * Renders mini health bars over GameObjects
     */
    public void renderMiniHealthBars(){

        for(Entity entity : em.getEntitiesWithComponent(UIHealthComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
            HealthComponent health = (HealthComponent)entity.getComponent(HealthComponent.ID);

            Vector2 barPos =  new Vector2(
                    phys.getPosition().x - phys.getWidth()*2,
                    phys.getPosition().y + phys.getHeight() + 0.1f
            );

            Vector2 outlineSize = new Vector2(1, 0.1f);
            float healthWidth = health.getAmount() * outlineSize.x/health.getMaxAmount();

            shapeRenderer.setProjectionMatrix(getSystemManager().getSystem(RenderingSystem.class).getCamera().combined);

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
