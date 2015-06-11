package com.brm.Kubotz.Systems.RendringSystems;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.viewport.*;
import com.brm.GoatEngine.ECS.utils.Components.HealthComponent;
import com.brm.GoatEngine.ECS.utils.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity.Entity;
import com.brm.GoatEngine.ECS.core.Systems.EntitySystem;
import com.brm.Kubotz.Components.Graphics.UIHealthComponent;
import com.brm.Kubotz.Config;

/**
 * Sub System responsible of rendering HUD, on screen elements
 */
public class HUDSystem extends EntitySystem {

    private final OrthographicCamera hudCamera;

    private final ShapeRenderer shapeRenderer;
    private final SpriteBatch spriteBatch;

    private final Viewport viewport;



    private Texture badge = new Texture(Gdx.files.internal("hud-multi-badge.png"));
    private Texture timer = new Texture(Gdx.files.internal("hud-multi-timer.png"));
    private Texture bars = new Texture(Gdx.files.internal("hud-multi-bars.png"));

    public HUDSystem(ShapeRenderer shapeRenderer, SpriteBatch spriteBatch) {
        this.shapeRenderer = new ShapeRenderer();
        this.spriteBatch = new SpriteBatch();

        hudCamera = new OrthographicCamera(Config.V_WIDTH, Config.V_HEIGHT);
        viewport = new FitViewport(Config.V_WIDTH, Config.V_HEIGHT, hudCamera);

    }






    @Override
    public void init() {

    }

    @Override
    public void update(float dt){
        this.renderMiniHealthBars();

        int currentWidth = Gdx.graphics.getWidth();
        int currentHeight = Gdx.graphics.getHeight();

        viewport.update(currentWidth, currentHeight);



        //HUD
        spriteBatch.setProjectionMatrix(hudCamera.combined);
        spriteBatch.begin();


        spriteBatch.draw(this.timer, 0-this.timer.getWidth()/2, Config.V_HEIGHT/2 - this.timer.getHeight());

        spriteBatch.draw(this.bars, -Config.V_WIDTH/2 + this.badge.getWidth()/2 + 30, Config.V_HEIGHT/2 -this.badge.getHeight()/2,
                this.bars.getWidth(), this.bars.getHeight());

        spriteBatch.draw(this.badge, -Config.V_WIDTH/2, Config.V_HEIGHT/2 - this.badge.getHeight(),
                this.badge.getWidth(), this.badge.getHeight());


        spriteBatch.end();


    }





    /**
     * Renders mini health bars over GameObjects
     */
    public void renderMiniHealthBars(){

        for(Entity entity : getEntityManager().getEntitiesWithComponent(UIHealthComponent.ID)){
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
            Color lightGreen = new Color(0, 79, 54, 255f);
            Color darkGreen =  new Color(125,244,102, 255);

            shapeRenderer.begin(ShapeRenderer.ShapeType.Filled);
            shapeRenderer.setColor(lightGreen);
            shapeRenderer.rect(barPos.x, barPos.y, healthWidth, outlineSize.y);
            shapeRenderer.end();

        }
    }




}
