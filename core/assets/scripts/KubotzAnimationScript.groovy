import com.badlogic.gdx.Gdx
import com.badlogic.gdx.math.Vector2
import com.brm.GoatEngine.Animator.AnimState
import com.brm.GoatEngine.Animator.Animator
import com.brm.GoatEngine.Animator.Condition
import com.brm.GoatEngine.ECS.common.ParticleEffectComponent
import com.brm.GoatEngine.ECS.common.PhysicsComponent
import com.brm.GoatEngine.ECS.common.SpriterAnimationComponent
import com.brm.GoatEngine.ECS.core.Entity
import com.brm.GoatEngine.ECS.core.EntityManager
import com.brm.GoatEngine.EventManager.EntityEvent
import com.brm.GoatEngine.GoatEngine
import com.brm.GoatEngine.Input.VirtualGamePad
import com.brm.GoatEngine.ScriptingEngine.EntityScript
import com.brm.GoatEngine.Utils.Math.GameMath
import com.brm.Kubotz.Common.Events.DamageTakenEvent
import com.brm.Kubotz.Common.Events.StunnedFinishedEvent
import com.brm.Kubotz.Constants
import com.brm.Kubotz.Features.DashBoots.DashPhaseChangeEvent
import com.brm.Kubotz.Features.GameRules.PlayerDeadEvent
import com.brm.Kubotz.Features.KubotzCharacter.Components.BigBuffHeadComponent
import com.brm.Kubotz.Features.KubotzCharacter.Components.SkullHeadComponent
import com.brm.Kubotz.Features.KubotzCharacter.Components.TerminatorHeadComponent
import com.brm.Kubotz.Features.LaserGuns.FinishGunShotEvent
import com.brm.Kubotz.Features.LaserGuns.GunComponent
import com.brm.Kubotz.Features.LaserGuns.GunShotEvent
import com.brm.Kubotz.Features.LaserSword.FinishSwordSwingEvent
import com.brm.Kubotz.Features.LaserSword.LaserSwordComponent
import com.brm.Kubotz.Features.LaserSword.SwordSwingEvent
import com.brm.Kubotz.Features.MeleeAttacks.FinishPunchEvent
import com.brm.Kubotz.Features.MeleeAttacks.PunchEvent
import com.brm.Kubotz.Input.GameButton
/**
 * Updates a kubotz Sprite according to animation and movement
 * It is an animation Controller
 */
public class KubotzAnimationScript extends EntityScript {

    public static final String IDLE = "Idle";
    public static final String RUNNING = "Running";
    public static final String JUMPING = "Jumping";
    public static final String FALLING = "Falling";
    public static final String PUNCHING = "Punching";
    public static final String AIR_KICKING = "Air Kicking";
    public static final String KICKING = "Kicking";


    public static final String SHOOTING = "Shooting";
    public static final String SWORD_SLASH = "Sword_slash1";

    public static final String HURT = "Hit";

    public static final String DYING = "Dying";

    public static final String DASH_BEGIN = "Dash_begin";
    public static final String DASH_DASHIN = "Dash_dashin";




    public static final int CHAR_MAP_HEAD_ID = 0;
    public static final int CHAR_MAP_ARM_ID = 0;
    public static final int CHAR_MAP_BOOTS_ID = 0;


    Animator animator;


    /**
     * Called when a script is added to an entity
     */
    public void onInit(Entity entity, EntityManager entityManager){

        // INIT ANIMATOR //TODO XML Animator
        this.animator = new Animator();

        AnimState idle = new AnimState(IDLE);
        AnimState running = new AnimState(RUNNING);
        AnimState jumping = new AnimState(JUMPING);
        AnimState falling = new AnimState(FALLING);


        animator.addParameter("speed");


        animator.setEnterState(idle);
        animator.addState(running)
                .addState(running)
                .addState(jumping)
                .addState(falling);


        //IDLE -> RUNNING
        idle.addTransition(running,
                new Condition(animator.getParameter("speed"), Condition.ConditionOperation.GREATER_THAN, 0.1f)
        );

        //RUNNING -> IDLE
        running.addTransition(idle,
                new Condition(animator.getParameter("speed"), Condition.ConditionOperation.LESS_THAN, 0.1f)
        );




    }



    @Override
    public <T extends EntityEvent> void onEvent(T event, Entity entity) {

    }



    @Override
    public void onUpdate(Entity entity, EntityManager entityManager) {
        PhysicsComponent phys = (PhysicsComponent)entity.getComponent(PhysicsComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent)entity.getComponent(SpriterAnimationComponent.ID);

        this.animator.setFloat("speed", Math.abs(phys.getVelocity().x));
        this.animator.update();




        anim.setAnimation(this.animator.getCurrentState().getAnimation());

    }







    /**
     * Flips the Sprite to the side the character is looking at
     * @param phys
     * @param anim
     */
    private void handleFlip(PhysicsComponent phys, SpriterAnimationComponent anim){
        //Handle Flip
        if(phys.getDirection() == PhysicsComponent.Direction.RIGHT){
            if(!anim.getPlayer().isFlippedX()){
                anim.getPlayer().flipX();
            }
        }else{
            if(anim.getPlayer().isFlippedX()){
                anim.getPlayer().flipX();
            }
        }
    }



    /**
     * Applies the necessary character maps to an entity
     */
    private void handleCharacterMaps(Entity entity, SpriterAnimationComponent anim){

        anim.getPlayer().characterMaps = new com.brashmonkey.spriter.Entity.CharacterMap[3];
        // HEADS
        if(entity.hasComponent(BigBuffHeadComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_HEAD_ID] = anim.getPlayer().getEntity().getCharacterMap("head_bigbuff");
        } else if(entity.hasComponent(SkullHeadComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_HEAD_ID] = anim.getPlayer().getEntity().getCharacterMap("head_skull");
        } else if(entity.hasComponent(TerminatorHeadComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_HEAD_ID] = anim.getPlayer().getEntity().getCharacterMap("head_terminator");
        }


        // ARMS
        // LASER SWORD
        if(entity.hasComponentEnabled(LaserSwordComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_ARM_ID] = anim.getPlayer().getEntity().getCharacterMap("weapon_laserSword");
        }else if(entity.hasComponent(GunComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_ARM_ID] = anim.getPlayer().getEntity().getCharacterMap("weapon_laserGunMkI");
        }

        // BOOTS //TODO complete!
        /*if(entity.hasComponentEnabled(FlyingBootsComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_BOOTS_ID] = anim.getPlayer().getEntity().getCharacterMap("boots_fly");
        }else if(entity.hasComponent(MagneticBootsComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_BOOTS_ID] = anim.getPlayer().getEntity().getCharacterMap("boots_magnetic");
        }else if(entity.hasComponent(DashBootsComponent.ID)){
            anim.getPlayer().characterMaps[CHAR_MAP_BOOTS_ID] = anim.getPlayer().getEntity().getCharacterMap("boots_dash");
        }*/


    }




    /**
     * Creates motion dust for a certain entity
     */
    private void createMotionDust(Entity entity, PhysicsComponent phys){

        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        Vector2 pos = phys.getPosition().cpy();
        pos.y -= phys.getHeight();
        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_LANDING_DUST), pos);
    }

    private void createHurtParticles(Entity entity, PhysicsComponent phys){
        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        Vector2 pos = phys.getPosition().cpy();
        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_HIT_STARS), pos);
    }




    /**
     * Creates a sword trail
     * @param entity
     */
    private void createSwordTrail(Entity entity){
        if(true){   //TODO Take this off
            return;
        }
        ParticleEffectComponent pef = (ParticleEffectComponent) entity.getComponent(ParticleEffectComponent.ID);
        SpriterAnimationComponent anim = (SpriterAnimationComponent) entity.getComponent(SpriterAnimationComponent.ID);
        float x = anim.getPlayer().getBone("hand_bone_front").position.x;
        float y = anim.getPlayer().getBone("hand_bone_front").position.y;

        pef.addEffect(Gdx.files.internal(Constants.PARTICLES_HIT_STARS), new Vector2(x,y));

    }






}