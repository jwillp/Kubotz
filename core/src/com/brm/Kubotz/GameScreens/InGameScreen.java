package com.brm.Kubotz.GameScreens;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.maps.MapObjects;
import com.badlogic.gdx.maps.objects.RectangleMapObject;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.maps.tiled.renderers.OrthogonalTiledMapRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brashmonkey.spriter.Spriter;
import com.brashmonkey.spriter.gdxIntegration.LibGdxSpriterDrawer;
import com.brashmonkey.spriter.gdxIntegration.LibGdxSpriterLoader;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityManager;
import com.brm.GoatEngine.ECS.core.EntitySystemManager;
import com.brm.GoatEngine.ScriptingEngine.ScriptSystem;
import com.brm.GoatEngine.ScreenManager.GameScreen;
import com.brm.GoatEngine.ScreenManager.GameScreenManager;
import com.brm.GoatEngine.Utils.Logger;
import com.brm.Kubotz.Common.Systems.AISystem;
import com.brm.Kubotz.Common.Systems.AttackSystems.DamageSystem;
import com.brm.Kubotz.Common.Systems.LifespanSystem;
import com.brm.Kubotz.Common.Systems.PhysicsSystem;
import com.brm.GoatEngine.ECS.EntityXMLFactory;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.GameRules.Systems.GameRulesSystem;
import com.brm.Kubotz.Features.GameRules.Systems.LifeBasedFreeForAll;
import com.brm.Kubotz.Features.KubotzCharacter.Components.SkullHeadComponent;
import com.brm.Kubotz.Features.PowerUps.Systems.PowerUpsSystem;
import com.brm.Kubotz.Features.Respawn.Components.SpawnPointComponent;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Features.Rooms.Entities.BlockFactory;
import com.brm.Kubotz.Features.Grab.Systems.GrabSystem;
import com.brm.Kubotz.Features.Respawn.Systems.RespawnSystem;
import com.brm.Kubotz.Input.InputTranslationSystem;
import com.brm.Kubotz.Common.Systems.AttackSystems.AttackSystem;
import com.brm.Kubotz.Features.MeleeAttacks.Systems.MeleeSystem;
import com.brm.Kubotz.Common.Systems.MovementSystems.MovementSystem;
import com.brm.Kubotz.Common.Systems.RendringSystems.AnimationSystem;
import com.brm.Kubotz.Common.Systems.RendringSystems.RenderingSystem;
import com.brm.Kubotz.Common.Systems.SkillsSystem.SkillsSystem;


public class InGameScreen extends GameScreen {

    private EntityManager entityManager;
    private EntitySystemManager systemManager;

    //MAP
    private TiledMap tiledMap;
    private OrthogonalTiledMapRenderer mapRenderer;


    private boolean isPlayerOneSpawned = false;


    @Override
    public void init(GameScreenManager engine) {
        super.init(engine);
        Logger.info("In Game State initialisation");

        // Systems Init
        entityManager = ecsManager.getEntityManager();
        systemManager = ecsManager.getSystemManager();


        systemManager.addSystem(PhysicsSystem.class, new PhysicsSystem());

        //Camera
        EntityXMLFactory.createEntity("blueprint/Camera.xml", this.getEntityManager(),
                this.systemManager.getSystem(PhysicsSystem.class).getWorld());


        systemManager.addSystem(RenderingSystem.class, new RenderingSystem());
        systemManager.addSystem(InputTranslationSystem.class, new InputTranslationSystem());
        systemManager.addSystem(MovementSystem.class, new MovementSystem());

        systemManager.addSystem(GrabSystem.class, new GrabSystem());

        systemManager.addSystem(SkillsSystem.class, new SkillsSystem());

        systemManager.addSystem(PowerUpsSystem.class, new PowerUpsSystem());

        systemManager.addSystem(MeleeSystem.class, new MeleeSystem());

        systemManager.addSystem(LifespanSystem.class, new LifespanSystem());

        systemManager.addSystem(DamageSystem.class, new DamageSystem());

        systemManager.addSystem(AttackSystem.class, new AttackSystem());

        systemManager.addSystem(ScriptSystem.class, new ScriptSystem());

        systemManager.addSystem(AnimationSystem.class, new AnimationSystem());

        systemManager.addSystem(RespawnSystem.class, new RespawnSystem());

        systemManager.addSystem(AISystem.class, new AISystem());


        // LIFE BASED FREE FOR ALL
        systemManager.addSystem(GameRulesSystem.class, new GameRulesSystem());
        systemManager.getSystem(GameRulesSystem.class).setActiveRuleSystem(LifeBasedFreeForAll.class, new LifeBasedFreeForAll());



        //INIT SYSTEMS
        systemManager.initSystems();


        // Init Animation Manager
        Spriter.setDrawerDependencies(
                systemManager.getSystem(RenderingSystem.class).getSpriteBatch(),
                systemManager.getSystem(RenderingSystem.class).getShapeRenderer()
        );
        Spriter.init(LibGdxSpriterLoader.class, LibGdxSpriterDrawer.class);
        Spriter.load(Gdx.files.internal(Constants.KUBOTZ_ANIM_FILE).read(), Constants.KUBOTZ_ANIM_FILE);


        











        Logger.info("In Game State initialised");
    }



    @Override
    public void cleanUp(){}

    @Override
    public void resume(){}

    @Override
    public void handleInput(GameScreenManager engine){
        systemManager.getSystem(InputTranslationSystem.class).handleInput();
        //Since Scripts Can produce Input during their update phase
        systemManager.getSystem(ScriptSystem.class).handleInput();
        systemManager.getSystem(ScriptSystem.class).update(0);
    }

    @Override
    public void update(GameScreenManager engine, float deltaTime) {

        systemManager.getSystem(AISystem.class).update(deltaTime);

        systemManager.getSystem(ScriptSystem.class).update(deltaTime);

        systemManager.getSystem(PhysicsSystem.class).update(deltaTime);
        systemManager.getSystem(AnimationSystem.class).update(deltaTime);




    }

    @Override

    public void draw(GameScreenManager engine, float deltaTime) {

        // DRAW WORLD
        systemManager.getSystem(RenderingSystem.class).update(deltaTime);


    }
}
