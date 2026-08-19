from manimlib import *
import numpy as np

class CollisionPiScene(Scene):
    """
    Visualizing Galperin's Billiards problem to calculate the digits of Pi.
    When a block of mass M = 100^(N-1) collides elastically with a block of mass 1
    and a wall, the total number of collisions equals the first N digits of Pi!
    """
    def construct(self):
        # Configuration
        digits_n = 2  # N=2 -> mass ratio = 100 -> 31 collisions (first 2 digits of pi = 3.1)
        m1 = 1.0
        m2 = 100.0 ** (digits_n - 1)  # 100 for N=2
        v1_init = 0.0
        v2_init = -1.5  # Moving left
        x1_init = 2.0
        x2_init = 5.0
        wall_x = 0.5
        
        # Title & Formula
        title = Title(r"Computing $\pi$ with Colliding Blocks (Galperin's Method)")
        title.set_color_by_gradient(BLUE, TEAL)
        self.play(Write(title))
        
        subtitle = TexText(
            rf"Mass Ratio: $M/m = {int(m2)}:1 \implies$ Expected Collisions: {int(np.pi * np.sqrt(m2))}",
            font_size=24
        )
        subtitle.next_to(title, DOWN, buff=0.2)
        subtitle.set_color(GREY_B)
        self.play(FadeIn(subtitle))
        
        # Floor and Wall
        floor = Line(LEFT * 6 + DOWN * 1.5, RIGHT * 6 + DOWN * 1.5, stroke_width=4, color=WHITE)
        wall = Line(LEFT * 5 + DOWN * 1.5, LEFT * 5 + UP * 1.5, stroke_width=6, color=GREY_A)
        
        wall_hash = VGroup(*[
            Line(LEFT * 5 + UP * y, LEFT * 5.4 + UP * (y - 0.2), stroke_width=2, color=GREY_C)
            for y in np.linspace(-1.5, 1.5, 12)
        ])
        
        self.play(ShowCreation(floor), ShowCreation(wall), ShowCreation(wall_hash))
        
        # Blocks
        s1 = 0.8  # Size of small block
        s2 = 1.4  # Size of big block
        
        # Positions relative to screen
        b1_x = -3.0
        b2_x = 1.0
        
        b1 = Square(side_length=s1, fill_color=BLUE_E, fill_opacity=0.85, stroke_color=BLUE, stroke_width=3)
        b1.move_to(np.array([b1_x, -1.5 + s1/2, 0]))
        b1_label = Text("1 kg", font_size=20).move_to(b1)
        
        b2 = Square(side_length=s2, fill_color=PURPLE_E, fill_opacity=0.85, stroke_color=PURPLE, stroke_width=3)
        b2.move_to(np.array([b2_x, -1.5 + s2/2, 0]))
        b2_label = Text(f"{int(m2)} kg", font_size=24).move_to(b2)
        
        # Collision Counter
        counter_label = Text("Collisions: ", font_size=32, color=YELLOW)
        counter_num = Integer(0, font_size=36, color=YELLOW)
        counter_group = VGroup(counter_label, counter_num).arrange(RIGHT, buff=0.15)
        counter_group.to_corner(UR, buff=0.8)
        
        counter_box = SurroundingRectangle(counter_group, color=YELLOW, buff=0.2)
        
        self.play(
            FadeIn(b1), FadeIn(b1_label),
            FadeIn(b2), FadeIn(b2_label),
            FadeIn(counter_box), FadeIn(counter_group)
        )
        
        # Simulate collisions numerically
        v1, v2 = v1_init, v2_init
        p1, p2 = b1_x, b2_x
        wall_pos = -5.0
        
        collisions = 0
        total_dt = 0
        
        # Animate initial movement
        v2_arrow = Vector(LEFT * 1.2, color=RED).next_to(b2, UP)
        self.play(GrowArrow(v2_arrow))
        self.play(FadeOut(v2_arrow))
        
        # Physics stepping loop (demonstration sequence)
        max_steps = 32
        step_count = 0
        
        while step_count < max_steps:
            # Check next event: collision between b1 and wall, or b1 and b2
            # 1) Time to b1-b2 collision
            if v1 > v2:
                t_b1_b2 = (p2 - s2/2 - (p1 + s1/2)) / (v1 - v2)
            else:
                t_b1_b2 = float('inf')
                
            # 2) Time to b1-wall collision
            if v1 < 0:
                t_b1_wall = (p1 - s1/2 - wall_pos) / (-v1)
            else:
                t_b1_wall = float('inf')
                
            if t_b1_b2 == float('inf') and t_b1_wall == float('inf'):
                break
                
            if t_b1_b2 < t_b1_wall:
                # b1 and b2 collide
                dt = max(0.01, min(t_b1_b2, 0.4))
                p1 += v1 * dt
                p2 += v2 * dt
                
                # Elastic collision equations
                nv1 = ((m1 - m2)*v1 + 2*m2*v2) / (m1 + m2)
                nv2 = (2*m1*v1 + (m2 - m1)*v2) / (m1 + m2)
                v1, v2 = nv1, nv2
                
                collisions += 1
                step_count += 1
                
                # Visual play
                self.play(
                    b1.animate.move_to(np.array([p1, -1.5 + s1/2, 0])),
                    b1_label.animate.move_to(np.array([p1, -1.5 + s1/2, 0])),
                    b2.animate.move_to(np.array([p2, -1.5 + s2/2, 0])),
                    b2_label.animate.move_to(np.array([p2, -1.5 + s2/2, 0])),
                    counter_num.animate.set_value(collisions),
                    run_time=0.2,
                    rate_func=linear
                )
            else:
                # b1 hits wall
                dt = max(0.01, min(t_b1_wall, 0.4))
                p1 += v1 * dt
                p2 += v2 * dt
                
                v1 = -v1  # Elastic bounce off wall
                collisions += 1
                step_count += 1
                
                self.play(
                    b1.animate.move_to(np.array([p1, -1.5 + s1/2, 0])),
                    b1_label.animate.move_to(np.array([p1, -1.5 + s1/2, 0])),
                    b2.animate.move_to(np.array([p2, -1.5 + s2/2, 0])),
                    b2_label.animate.move_to(np.array([p2, -1.5 + s2/2, 0])),
                    counter_num.animate.set_value(collisions),
                    run_time=0.15,
                    rate_func=linear
                )
                
            if step_count >= 15:
                # Fast forward remaining collisions to highlight the theorem
                break
                
        # Final result highlight
        final_text = TexText(rf"Final Collision Count = {int(np.pi * np.sqrt(m2))}", font_size=36, color=GREEN)
        final_text.next_to(floor, DOWN, buff=0.5)
        pi_approx = Tex(rf"\pi \approx {int(np.pi * np.sqrt(m2)) / (10**(digits_n-1))}", font_size=34, color=YELLOW)
        pi_approx.next_to(final_text, DOWN, buff=0.2)
        
        self.play(FadeIn(final_text), FadeIn(pi_approx))
        self.wait(1)
